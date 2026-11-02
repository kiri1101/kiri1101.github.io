import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  FOCUS_ANGLE,
  RING,
  armR,
  armT,
  monogramPoints,
  ringPoints,
  shufflePoints,
  spherePoints,
  starField,
} from "./geometry";
import { GLYPHS_SIZE, MONOGRAM_FONT, MONOGRAM_FONT_FACE } from "./types";

const radius = (a: Float32Array, i: number) => Math.hypot(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);

describe("monogramPoints from glyphs a host rasterised (a worker without fonts)", () => {
  const { width: W, height: H } = GLYPHS_SIZE;
  /** Opaque only in the box x 100..199, y 50..149, as if the letters were drawn there. */
  const glyphs = () => {
    const data = new Uint8ClampedArray(W * H * 4);
    for (let y = 50; y < 150; y++) for (let x = 100; x < 200; x++) data[(y * W + x) * 4 + 3] = 255;
    return { width: W, height: H, data } as unknown as ImageData;
  };

  test("places every point inside the glyphs' ink, scaled to the monogram's 4.7 × 2.2 × 0.5 box", () => {
    const a = monogramPoints(2000, "LM", glyphs());
    expect(a).toHaveLength(6000);
    for (let i = 0; i < 2000; i++) {
      const [x, y, z] = [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];
      expect(x).toBeGreaterThanOrEqual((100 / W - 0.5) * 4.7 - 0.01);
      expect(x).toBeLessThanOrEqual((199 / W - 0.5) * 4.7 + 0.01);
      expect(y).toBeLessThanOrEqual(-(50 / H - 0.5) * 2.2 + 1e-6); // Float32 rounding
      expect(y).toBeGreaterThanOrEqual(-(149 / H - 0.5) * 2.2 - 1e-6);
      expect(Math.abs(z)).toBeLessThanOrEqual(0.25);
    }
  });

  test("blank glyphs are an error, not an empty orb", () => {
    const blank = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) } as unknown as ImageData;
    expect(() => monogramPoints(10, "LM", blank)).toThrow(/rendered no pixels/);
  });
});

test("a worker loads the monogram's face from the file the stylesheet declares for it", () => {
  const tokens = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8");
  const face = tokens.match(/@font-face\s*{[^}]*font-family:\s*"Inter Tight"[^}]*}/)?.[0] ?? "";
  // The stylesheet names the file by relative path, the module imports it (under Vitest its URL is the source path).
  const file = MONOGRAM_FONT_FACE.url.split("/").pop()!;
  expect(face).toContain(`url("../fonts/${file}")`);
  expect(face).toContain(`font-weight: ${MONOGRAM_FONT_FACE.weight};`);
  expect(MONOGRAM_FONT).toContain(`"${MONOGRAM_FONT_FACE.family}"`);
});

describe("spherePoints", () => {
  test("holds n xyz points, none outside the radius", () => {
    const a = spherePoints(1000, 1.6);
    expect(a).toHaveLength(3000);
    for (let i = 0; i < 1000; i++) expect(radius(a, i)).toBeLessThanOrEqual(1.6 + 1e-5);
  });

  test("most points sit on the shell and about one in six frosts the interior", () => {
    const n = 20000;
    const a = spherePoints(n, 1.6);
    let inside = 0;
    for (let i = 0; i < n; i++) if (radius(a, i) < 1.6 * 0.965 - 1e-5) inside++;
    expect(inside / n).toBeGreaterThan(0.12);
    expect(inside / n).toBeLessThan(0.2);
  });
});

describe("shufflePoints", () => {
  const yRange = (a: Float32Array, n: number) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      lo = Math.min(lo, a[i * 3 + 1]);
      hi = Math.max(hi, a[i * 3 + 1]);
    }
    return { lo, hi };
  };

  test("a lower tier's prefix covers the whole sphere, not just the top cap", () => {
    // The golden spiral runs top to bottom, so its first half is the upper hemisphere only.
    expect(yRange(spherePoints(2000, 1.6), 1000).lo).toBeGreaterThan(-0.01);
    const shuffled = yRange(shufflePoints(spherePoints(2000, 1.6)), 1000);
    expect(shuffled.lo).toBeLessThan(-1.2);
    expect(shuffled.hi).toBeGreaterThan(1.2);
  });

  test("keeps every point intact", () => {
    const a = spherePoints(500, 1.6);
    const key = (b: Float32Array) =>
      Array.from({ length: b.length / 3 }, (_, i) => `${b[i * 3]},${b[i * 3 + 1]},${b[i * 3 + 2]}`).sort();
    const before = key(a);
    expect(key(shufflePoints(a))).toEqual(before);
  });
});

describe("ringPoints", () => {
  // Undo the prototype's tilt about the x axis: the points must then lie in a flat torus around y.
  const untilt = (a: Float32Array, i: number) => {
    const [x, y, z] = [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];
    const c = Math.cos(RING.tilt);
    const s = Math.sin(RING.tilt);
    return { x, y: y * c + z * s, z: -y * s + z * c };
  };

  test("is a torus of radius 1.7 and tube 0.28, tilted 1.12 rad about the x axis", () => {
    expect(RING).toEqual({ tilt: 1.12, radius: 1.7, tube: 0.28 });
    const a = ringPoints(5000);
    expect(a).toHaveLength(15000);
    for (let i = 0; i < 5000; i++) {
      const p = untilt(a, i);
      const tube = Math.hypot(Math.hypot(p.x, p.z) - 1.7, p.y);
      expect(tube).toBeLessThanOrEqual(0.28 + 1e-5);
    }
  });

  test("the tilt is applied: the ring leans far out of the horizontal plane", () => {
    const a = ringPoints(5000);
    let maxY = 0;
    for (let i = 0; i < 5000; i++) maxY = Math.max(maxY, Math.abs(a[i * 3 + 1]));
    // A flat ring would stay within its tube (0.28); tilted by 1.12 rad it reaches about 1.7·sin(1.12) ≈ 1.53.
    expect(maxY).toBeGreaterThan(1.4);
  });
});

describe("galaxy", () => {
  test("the focused card sits at the prototype's angle", () => {
    expect(armT(3, false)).toBeCloseTo(FOCUS_ANGLE.wide);
    expect(armT(3, true)).toBeCloseTo(FOCUS_ANGLE.small);
    expect(FOCUS_ANGLE).toEqual({ wide: Math.PI / 2 - 0.5, small: Math.PI / 2 });
    expect(armR(0)).toBeCloseTo(0.25);
    expect(armR(1)).toBeCloseTo(1.8);
  });

  test("starField gives every star a position, a colour and a size", () => {
    const s = starField(3000, false);
    expect(s.position).toHaveLength(9000);
    expect(s.color).toHaveLength(9000);
    expect(s.size).toHaveLength(3000);
    for (let i = 0; i < 3000; i++) {
      expect(s.size[i]).toBeGreaterThanOrEqual(0.5);
      expect(s.size[i]).toBeLessThanOrEqual(2.7);
      expect(Number.isFinite(s.position[i * 3])).toBe(true);
    }
  });
});
