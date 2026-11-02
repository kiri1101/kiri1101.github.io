import { scrollForProject } from "./timeline";

/**
 * The scroll unit: the pixel height of a 100lvh probe. Unlike innerHeight it does not change when a
 * mobile address bar shows or hides, so the page does not jitter. Falls back to innerHeight.
 */
export function scrollUnit(doc: Document = document): number {
  const h = doc.getElementById("unit-probe")?.getBoundingClientRect().height ?? 0;
  return h > 0 ? h : window.innerHeight;
}

/** Jumps to the scroll position of project i; the smoothing in useScrollPhases animates the flight. */
export function flyToProject(i: number): void {
  window.scrollTo({ top: scrollForProject(i) * scrollUnit(), behavior: "instant" });
}

/** True for a plain left click; false for middle clicks and ctrl/meta/shift/alt clicks, which the browser should handle. */
export function isPlainClick(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
