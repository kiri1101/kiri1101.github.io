import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  PlaneGeometry,
  SRGBColorSpace,
  ShaderMaterial,
  Texture,
  Vector2,
  type Camera,
  type WebGLRenderer,
} from "three";
import { TIMELINE, ss } from "~/lib/timeline";
import { armR, armT } from "./geometry";
import type { CardInput } from "./types";

const { FOCUS_AGE } = TIMELINE;
const CARD_W = 3.4;
const CARD_H = CARD_W / 1.6;
/** How much of its fade-in a card makes per frame once its texture is up: a quarter to half a second. */
const APPEAR_STEP = 1 / 15;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** A card's place on its arm, `offset - index`, between these is on screen (see `update`: it fades in and out there). */
const ON_SCREEN = { from: 0, to: 3.85 } as const;

/**
 * The cards on screen at a card offset (the timeline's `cardOffset`), focused card included: the ones a scene that
 * starts here must show in its first frame. Empty before the first card comes out of the core.
 */
export function cardsOnScreen(offset: number, count: number): number[] {
  const on: number[] = [];
  for (let i = 0; i < count; i++) {
    const s = offset - i;
    if (s > ON_SCREEN.from && s < ON_SCREEN.to) on.push(i);
  }
  return on;
}

// Shaders from the approved prototype: a gently curved plane, rounded edges anti-aliased in the shader by a
// signed distance field (no MSAA needed), and a warm rim. One change: textures are sampled upside down, because
// card textures are uploaded top row first (no flip while decoding; see decode).
const vertexShader = `
      uniform float uBend; varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main() {
        vUv = uv; vec3 p = position; p.z -= uBend * p.x * p.x;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vView = normalize(-mv.xyz);
        vN = normalize(normalMatrix * normalize(vec3(2.0 * uBend * p.x, 0.0, 1.0)));
        gl_Position = projectionMatrix * mv;
      }`;

const fragmentShader = `
      uniform sampler2D uMap; uniform float uFocus, uOpacity, uRadius; uniform vec2 uSize; uniform vec3 uRim;
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main() {
        vec2 p = (vUv - 0.5) * uSize;
        float d = sdRound(p, uSize * 0.5, uRadius);
        float aa = fwidth(d) * 1.2;
        float mask = 1.0 - smoothstep(-aa, aa, d);
        if (mask <= 0.001) discard;
        vec3 col = texture2D(uMap, vec2(vUv.x, 1.0 - vUv.y)).rgb;
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(l), col, 0.5 + 0.5 * uFocus) * (0.38 + 0.62 * uFocus);
        float edge = 1.0 - smoothstep(0.0, 0.05, -d);
        float fres = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), 2.0);
        col += uRim * (edge * 0.42 + fres * 0.3) * (0.35 + 0.65 * uFocus);
        gl_FragColor = vec4(col, mask * uOpacity);
        #include <colorspace_fragment>
      }`;

/** A 2×2 texture whose bilinear filtering gives the project's accent gradient (top-left `from`, bottom-right `to`). */
function accentTexture({ from, to }: CardInput["accent"]): DataTexture {
  const a = new Color(from).getHex();
  const b = new Color(to).getHex();
  const rgb = (hex: number) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  const [fa, fb] = [rgb(a), rgb(b)];
  const mid = fa.map((v, i) => Math.round((v + fb[i]) / 2));
  // Rows run top to bottom, like a card texture's (the shader samples upside down; flipY is off).
  const data = new Uint8Array([...fa, 255, ...mid, 255, ...mid, 255, ...fb, 255]);
  const t = new DataTexture(data, 2, 2);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = LinearFilter;
  t.minFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * Fetches and decodes a card texture without the DOM, so it also works in a worker. The file is already the
 * texture's size (CARD_TEXTURE), so there is no resize and no flip: Chrome applies those on the main thread when it
 * hands over the ImageBitmap, about 25 ms per card at load. WebGL ignores UNPACK_FLIP_Y for ImageBitmaps, so the
 * texture arrives top row first and the shader samples it upside down.
 */
async function decode(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return createImageBitmap(await res.blob());
}

/** The texture as given, then its WebP sibling for browsers that cannot decode AVIF into an ImageBitmap. */
const candidates = (image: string) => (/\.avif$/i.test(image) ? [image, image.replace(/\.avif$/i, ".webp")] : [image]);

/** Project cards spiralling out of the galaxy core along arm A. */
export function createCards(inputs: CardInput[], o: { small: boolean; anisotropy: number }) {
  const geometry = new PlaneGeometry(CARD_W, CARD_H, 40, 1);
  let disposed = false;

  const cards = inputs.map((input) => {
    const placeholder = accentTexture(input.accent);
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uMap: { value: placeholder as Texture },
        uFocus: { value: 0 },
        uOpacity: { value: 0 },
        uBend: { value: 0.06 },
        uSize: { value: new Vector2(CARD_W, CARD_H) },
        uRadius: { value: 0.13 },
        uRim: { value: new Color(1.0, 0.82, 0.68) },
      },
      vertexShader,
      fragmentShader,
    });
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    // `requested`: its texture is being fetched (or done); `ready`: its texture is up (or could not be loaded, and the
    // accent stands in); `appear`: its fade-in, 0..1.
    return { input, mesh, material, placeholder, texture: null as Texture | null, requested: false, ready: false, appear: 0 };
  });
  type Card = (typeof cards)[number];
  type Decoded = { card: Card; bitmap: ImageBitmap };
  /** Decoded textures waiting for upload, one per frame. */
  const decoded: Decoded[] = [];
  /** Decoded textures for the first frame (prime), uploaded together before it. */
  const primed: Decoded[] = [];
  let loading = false;

  /** Fetches and decodes one card's texture into `into`; a card whose texture cannot be loaded keeps its accent. */
  const fetchTexture = async (card: Card, into: Decoded[]) => {
    if (card.requested) return;
    card.requested = true;
    for (const url of candidates(card.input.image)) {
      try {
        const bitmap = await decode(url);
        if (disposed) return bitmap.close();
        into.push({ card, bitmap });
        return;
      } catch {
        // try the next format; if none decodes, the accent gradient stands in
      }
    }
    card.ready = true;
  };

  const upload = (renderer: WebGLRenderer, { card, bitmap }: Decoded) => {
    const t = new Texture(bitmap);
    t.flipY = false;
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = o.anisotropy;
    t.generateMipmaps = true;
    t.minFilter = LinearMipmapLinearFilter;
    t.magFilter = LinearFilter;
    t.needsUpdate = true;
    renderer.initTexture(t);
    // Uploaded; the GPU copy is all the card needs. Twelve decoded textures would hold tens of MB on a phone, and
    // after a lost context the host builds a new scene rather than re-uploading these.
    bitmap.close();
    card.texture = t;
    card.material.uniforms.uMap.value = t;
    card.placeholder.dispose();
    card.ready = true;
  };

  return {
    meshes: cards.map((c) => c.mesh),

    /**
     * Fetches and decodes every card texture not yet requested, in the background (the scene calls this once it is
     * live and the browser is idle, so nothing competes with the first screen). Decoded textures wait for
     * `uploadNext`.
     */
    load() {
      if (loading || disposed) return;
      loading = true;
      for (const card of cards) void fetchTexture(card, decoded);
    },

    /**
     * For a scene that starts in the galaxy: fetches and decodes the textures of the cards at `indices` (the ones on
     * screen) now, still off the main thread where the scene runs in a worker. Resolves once all have arrived or
     * failed; `uploadPrimed` then puts them up together, so the first frame already shows them.
     */
    async prime(indices: number[]): Promise<void> {
      await Promise.all(indices.filter((i) => cards[i]).map((i) => fetchTexture(cards[i], primed)));
    },

    /**
     * Uploads every primed texture, fully shown at once: the first frame fades in as a whole (scene.ts). Returns
     * whether it uploaded any (one-off work the frame statistics leave out).
     */
    uploadPrimed(renderer: WebGLRenderer): boolean {
      const ready = primed.splice(0);
      for (const d of ready) {
        upload(renderer, d);
        d.card.appear = 1;
      }
      return ready.length > 0;
    },

    /**
     * Uploads at most one decoded texture: called once per frame, so no frame does more than one upload.
     * Returns whether it uploaded one (one-off work the frame statistics leave out).
     */
    uploadNext(renderer: WebGLRenderer): boolean {
      const next = decoded.shift();
      if (!next) return false;
      upload(renderer, next);
      return true;
    },

    /** Places the cards for this frame; `offset` is the timeline's card offset and `sway` the galaxy's. */
    update(offset: number, gIn: number, sway: number, camera: Camera) {
      cards.forEach((c, i) => {
        // A card is not drawn until its texture is up, then fades in: never a blank rectangle, never a pop.
        if (c.ready && c.appear < 1) c.appear = Math.min(1, c.appear + APPEAR_STEP);
        const s = offset - i;
        const vis = ss(ON_SCREEN.from, 0.7, s) * (1 - ss(3.35, ON_SCREEN.to, s)) * gIn * c.appear; // leave quickly once past focus
        c.mesh.visible = vis > 0.003;
        if (!c.mesh.visible) return;
        const sc = clamp(s, 0, 4.6);
        const r = armR(sc);
        const th = armT(sc, o.small) + sway;
        c.mesh.position.set(Math.cos(th) * r, 0.16 * Math.sin(sc * 1.7) + Math.max(0, sc - FOCUS_AGE) * 2.6, Math.sin(th) * r);
        c.mesh.scale.setScalar(0.24 + 0.76 * ss(0.15, FOCUS_AGE, sc));
        c.mesh.lookAt(camera.position);
        c.mesh.rotateY((sc - FOCUS_AGE) * 0.34);
        c.mesh.rotateZ(-0.035 * (sc - FOCUS_AGE));
        const f = 1 - ss(0, 1.0, Math.abs(sc - FOCUS_AGE));
        const u = c.material.uniforms;
        u.uFocus.value = f;
        u.uOpacity.value = vis;
        u.uBend.value = 0.035 + 0.05 * (1 - f);
        c.mesh.renderOrder = -c.mesh.position.distanceTo(camera.position);
      });
    },

    dispose() {
      disposed = true;
      for (const d of [...decoded.splice(0), ...primed.splice(0)]) d.bitmap.close();
      geometry.dispose();
      for (const c of cards) {
        c.material.dispose();
        c.placeholder.dispose();
        c.texture?.dispose();
      }
    },
  };
}
