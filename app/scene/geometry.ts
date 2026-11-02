/**
 * Point clouds for the orb and the galaxy, ported from the approved prototype. Plain arrays only:
 * no three.js and no DOM, so the same code runs in a worker.
 */
import { TIMELINE } from "~/lib/timeline";
import { GLYPHS_SIZE, MONOGRAM_FONT } from "./types";

const rand = Math.random;
const TAU = Math.PI * 2;

function gauss(): number {
  let u = 0;
  let v = 0;
  while (!u) u = rand();
  while (!v) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

/** A golden-spiral sphere of radius `r` with a thin frosted shell and about 16% of the points inside. */
export function spherePoints(n: number, r: number): Float32Array {
  const a = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const ring = Math.sqrt(1 - y * y);
    const phi = i * golden;
    let k = r * (0.965 + 0.035 * rand());
    if (rand() < 0.16) k *= Math.cbrt(rand()) * 0.9; // a frosted interior
    a[i * 3] = Math.cos(phi) * ring * k;
    a[i * 3 + 1] = y * k;
    a[i * 3 + 2] = Math.sin(phi) * ring * k;
  }
  return a;
}

/**
 * The letters of `text` rasterised white on a GLYPHS_SIZE 2D OffscreenCanvas with MONOGRAM_FONT (the caller makes
 * sure the font is loaded). The scene does this itself, unless a host whose worker cannot load fonts hands it over.
 */
export function monogramGlyphs(text: string): ImageData {
  const { width: W, height: H } = GLYPHS_SIZE;
  const g = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("monogramGlyphs: no 2D OffscreenCanvas context");
  g.fillStyle = "#fff";
  g.font = MONOGRAM_FONT;
  g.textAlign = "center";
  g.textBaseline = "middle";
  // maxWidth only matters for monograms longer than two letters; "LM" fits with room to spare.
  g.fillText(text, W / 2, H / 2 + 10, W * 0.94);
  return g.getImageData(0, 0, W, H);
}

/**
 * Points filling the letters of `text`: rasterised here with `monogramGlyphs`, or given already rasterised.
 * Scaled as in the prototype: 4.7 wide, 2.2 tall, 0.5 deep.
 */
export function monogramPoints(n: number, text: string, glyphs?: ImageData): Float32Array {
  const { width: W, height: H, data: d } = glyphs ?? monogramGlyphs(text);
  const px: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 128) px.push(x, y);
  const count = px.length / 2;
  if (count === 0) throw new Error(`monogramPoints: "${text}" rendered no pixels`);
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const j = ((rand() * count) | 0) * 2;
    a[i * 3] = (px[j] / W - 0.5) * 4.7 + (rand() - 0.5) * 0.02;
    a[i * 3 + 1] = -(px[j + 1] / H - 0.5) * 2.2;
    a[i * 3 + 2] = (rand() - 0.5) * 0.5;
  }
  return a;
}

/** The ring stage: a torus of radius 1.7 with a 0.28 tube, tilted 1.12 rad about the x axis. */
export const RING = { tilt: 1.12, radius: 1.7, tube: 0.28 } as const;

export function ringPoints(n: number): Float32Array {
  const a = new Float32Array(n * 3);
  const ct = Math.cos(RING.tilt);
  const st = Math.sin(RING.tilt);
  for (let i = 0; i < n; i++) {
    const th = rand() * TAU;
    const ph = rand() * TAU;
    const r = RING.tube * Math.sqrt(rand());
    const x = (RING.radius + r * Math.cos(ph)) * Math.cos(th);
    const y = r * Math.sin(ph);
    const z = (RING.radius + r * Math.cos(ph)) * Math.sin(th);
    a[i * 3] = x;
    a[i * 3 + 1] = y * ct - z * st;
    a[i * 3 + 2] = y * st + z * ct;
  }
  return a;
}

/**
 * Shuffles the order of xyz points in place, so any prefix is spread over the whole shape.
 * Lower quality tiers draw only a prefix; an unshuffled golden spiral would draw just a cap.
 */
export function shufflePoints(a: Float32Array): Float32Array {
  for (let i = a.length / 3 - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    for (let c = 0; c < 3; c++) {
      const t = a[i * 3 + c];
      a[i * 3 + c] = a[j * 3 + c];
      a[j * 3 + c] = t;
    }
  }
  return a;
}

// ---------- galaxy: two spiral arms; the cards ride arm A ----------

/** Angle on the arm where the focused card sits. */
export const FOCUS_ANGLE = { wide: Math.PI / 2 - 0.5, small: Math.PI / 2 } as const;

/** Distance from the core at arm position `s`. */
export const armR = (s: number) => 0.25 + 1.55 * Math.pow(Math.max(s, 0), 1.15);

/** Angle at arm position `s`; the focused card (s = FOCUS_AGE) sits at FOCUS_ANGLE. */
export const armT = (s: number, small: boolean) =>
  (small ? FOCUS_ANGLE.small : FOCUS_ANGLE.wide) - 1.15 * TIMELINE.FOCUS_AGE + 1.15 * s;

export type Stars = { position: Float32Array; color: Float32Array; size: Float32Array };

const BULGE = [1, 0.82, 0.62];
const PINK = [1, 0.55, 0.72];
const BLUE = [0.72, 0.82, 1];
const WHITE = [1, 0.97, 0.92];

/** `n` stars: a warm bulge around the core (16%) and two spiral arms. */
export function starField(n: number, small: boolean): Stars {
  const position = new Float32Array(n * 3);
  const color = new Float32Array(n * 3);
  const size = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let x: number, y: number, z: number, c: number[];
    if (rand() < 0.16) {
      // warm bulge around the core
      const r = Math.abs(gauss()) * 0.85;
      const th = rand() * TAU;
      x = Math.cos(th) * r;
      z = Math.sin(th) * r;
      y = gauss() * 0.12;
      c = BULGE;
    } else {
      const arm = i % 2;
      const s = Math.pow(rand(), 0.75) * 5.2;
      const r = armR(s);
      const spread = gauss() * (0.22 + 0.16 * s);
      const th = armT(s, small) + arm * Math.PI + spread * 0.18;
      x = Math.cos(th) * r + gauss() * 0.16 * (1 + s * 0.4);
      z = Math.sin(th) * r + gauss() * 0.16 * (1 + s * 0.4);
      y = gauss() * 0.1 * (1.2 - s * 0.15);
      const k = rand();
      c = k < 0.07 ? PINK : k < 0.55 ? BLUE : WHITE;
    }
    position.set([x, y, z], i * 3);
    color.set(c, i * 3);
    size[i] = 0.5 + rand() * rand() * 2.2;
  }
  return { position, color, size };
}
