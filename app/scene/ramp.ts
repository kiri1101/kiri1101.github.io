/**
 * The fade-in of a scene that starts past the hero (back from a case study, a deep link, a restored context). It
 * runs in the renderer (clip.ts multiplies the frame), over at least RAMP_MS and at least RAMP_FRAMES frames: on a
 * slow device each frame still adds at most a twelfth of the light, never a jump. At the hero there is no fade: the
 * poster is the scene's first frame.
 */
export const RAMP_MS = 600;
export const RAMP_FRAMES = 12;

/** The fade (0..1) for the next frame drawn: after `previous`, with the first frame drawn `elapsedMs` ago. */
export function rampStep(previous: number, elapsedMs: number): number {
  return Math.min(1, previous + 1 / RAMP_FRAMES, (elapsedMs + 1000 / 60) / RAMP_MS);
}
