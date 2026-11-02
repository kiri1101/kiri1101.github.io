import { site, type Rgb } from "~/site.config";

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const mix3 = (a: readonly number[], b: readonly number[], t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * The orb's colours for a morph value (0 sphere, 1 monogram, 2 ring) and a collapse heat (0..1).
 * The body and its aura shift together as it morphs; collapsing re-ignites it apricot.
 */
export function paletteAt(morph: number, heat: number): { core: Rgb; frost: Rgb } {
  const [sphere, monogram, ring] = site.palette;
  const t1 = clamp(morph);
  const t2 = clamp(morph - 1);
  const core = mix3(mix3(sphere.core, monogram.core, t1), ring.core, t2);
  const frost = mix3(mix3(sphere.frost, monogram.frost, t1), ring.frost, t2);
  return { core: mix3(core, sphere.core, heat), frost: mix3(frost, sphere.frost, heat) };
}
