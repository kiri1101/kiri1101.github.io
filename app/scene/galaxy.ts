import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Points,
  SRGBColorSpace,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
} from "three";
import { ss, type Phases } from "~/lib/timeline";
import { starField } from "./geometry";
import type { Tier } from "./types";

/** Stars per layout; tier 1 draws about two thirds of them. */
const STARS = { wide: 14000, small: 6000, tier1: { wide: 9000, small: 4000 } };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Shaders verbatim from the approved prototype.
const vertexShader = `
      uniform float uSize, uPR, uTime; attribute vec3 aColor; attribute float aSize;
      varying vec3 vColor; varying float vTw;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aSize * uPR / -mv.z;
        vColor = aColor; vTw = 0.72 + 0.28 * sin(uTime * 1.6 + position.x * 13.0 + position.z * 7.0);
      }`;

const fragmentShader = `
      uniform float uOpacity; varying vec3 vColor; varying float vTw;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a *= a; gl_FragColor = vec4(vColor * vTw, a * uOpacity); }`;

/** The galaxy core's glow: a soft radial sprite drawn on a 2D OffscreenCanvas (no DOM, so it works in a worker). */
function coreSprite(): Sprite {
  const c = new OffscreenCanvas(256, 256);
  const g = c.getContext("2d");
  if (!g) throw new Error("coreSprite: no 2D OffscreenCanvas context");
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, "rgba(255,255,255,1)");
  rg.addColorStop(0.1, "rgba(255,226,196,.95)");
  rg.addColorStop(0.32, "rgba(255,150,86,.32)");
  rg.addColorStop(1, "rgba(255,150,86,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  const s = new Sprite(
    new SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0 }),
  );
  s.renderOrder = -900;
  return s;
}

/** Star field shaped like two spiral arms, plus the bright core the orb collapses into. */
export function createGalaxy(o: { small: boolean; pr: number }) {
  const field = starField(o.small ? STARS.small : STARS.wide, o.small);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(field.position, 3));
  geometry.setAttribute("aColor", new BufferAttribute(field.color, 3));
  geometry.setAttribute("aSize", new BufferAttribute(field.size, 1));
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uSize: { value: 26 }, uPR: { value: o.pr }, uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader,
    fragmentShader,
  });
  const stars = new Points(geometry, material);
  stars.frustumCulled = false;
  stars.renderOrder = -1000;
  stars.visible = false;

  const core = coreSprite();
  core.visible = false;
  const coreMaterial = core.material;

  return {
    stars,
    core,

    /** Updates for this frame and returns the galaxy's slow sway (radians), which the cards ride too. */
    update(ph: Phases, P: number, time: number): number {
      const { gIn } = ph;
      material.uniforms.uOpacity.value = gIn;
      material.uniforms.uTime.value = time;
      stars.visible = gIn > 0.002; // don't pay for invisible stars
      const sway = 0.04 * Math.sin(time * 0.15);
      stars.rotation.y = -sway;
      coreMaterial.opacity = ss(2.15, 2.4, P);
      core.visible = coreMaterial.opacity > 0.002;
      core.scale.setScalar(
        lerp(1.1, 2.4, ss(2.6, 3.4, P)) + 0.9 * (ss(2.35, 2.5, P) * (1 - ss(2.5, 2.8, P))) + 0.12 * Math.sin(time * 2.1),
      );
      return sway;
    },

    setPixelRatio(pr: number) {
      material.uniforms.uPR.value = pr;
    },

    /** Tier 1 draws a prefix of the field, which is an even sample: the stars are generated in random order. */
    setTier(t: Tier) {
      const all = o.small ? STARS.small : STARS.wide;
      const tier1 = o.small ? STARS.tier1.small : STARS.tier1.wide;
      geometry.setDrawRange(0, t === 0 ? all : tier1);
    },

    dispose() {
      geometry.dispose();
      material.dispose();
      coreMaterial.map?.dispose();
      coreMaterial.dispose();
    },
  };
}
