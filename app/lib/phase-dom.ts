import { paletteAt } from "~/scene/palette";
import { HOLE_EDGE_PX, type Circle } from "~/scene/types";
import type { Rgb } from "~/site.config";
import { galleryChrome, galleryShown, ss, type Phases } from "./timeline";

export type Point = { x: number; y: number };
/**
 * Where a 3D scene's core is on screen, from its first frame (a fade-in included). `settled`: the scene is fully up
 * (any fade-in done) and draws the orb itself, so the poster steps aside; until then the poster stays.
 */
export type SceneCore = Point & { settled: boolean };
export type Viewport = { w: number; h: number };

/** The halo behind the orb, tinted with its core colour (0..1 RGB) so it shifts with the shape. */
export function glowBackground(core: Rgb): string {
  const [r, g, b] = core.map((v) => Math.round(v * 255));
  const c = `${r},${g},${b}`;
  return `radial-gradient(50% 50% at 50% 50%, rgba(${c},.6), rgba(${c},.2) 42%, rgba(${c},0) 70%)`;
}

const glowPainted = new WeakMap<HTMLElement, string>();

/** Repaints the glow only when its colour changes, not every frame. An empty value restores the stylesheet's. */
function paintGlow(el: HTMLElement, background: string): void {
  if (glowPainted.get(el) === background) return;
  glowPainted.set(el, background);
  el.style.background = background;
}

const darkMarked = new WeakMap<HTMLElement, boolean>();

/** Sets or removes `data-dark` (cream text on the dark page) only when it changes, not every frame. */
export function markDark(el: HTMLElement, dark: boolean): void {
  if (darkMarked.get(el) === dark) return;
  darkMarked.set(el, dark);
  el.toggleAttribute("data-dark", dark);
}

/** Sets opacity; fully transparent layers also become `visibility: hidden` so the browser skips them. */
export function fade(el: HTMLElement, o: number): void {
  const hidden = o <= 0.002;
  el.style.opacity = hidden ? "0" : String(o);
  el.style.visibility = hidden ? "hidden" : "visible";
}

/**
 * How far inside its edge the horizon still shows: its inset glow's 14 px spread plus three standard deviations
 * of its 70 px blur (σ = 35 px). Past that the glow is below one 8-bit step.
 */
export const HORIZON_REACH = 14 + 3 * 35;

export type BlackHole = {
  rpx: number;
  /**
   * The window onto space: "closed" before the hole opens, a disc around the centre while it opens, and "open"
   * (the whole viewport) once the hole has swallowed the studio or covers every corner of the viewport.
   */
  window: "closed" | "open" | Circle;
  /** Where the 3D scene may draw while the hole opens (stars only inside the hole); null: everywhere. */
  sceneClip: Circle | null;
  studioOpacity: number;
  horizonOpacity: number;
};

/** Distance from `p` to the farthest corner of the viewport. */
const farthestCorner = (p: Point, view: Viewport) => Math.hypot(Math.max(p.x, view.w - p.x), Math.max(p.y, view.h - p.y));

/**
 * The black-hole opening: a disc growing from `centre` that swallows the studio and reveals space.
 *
 * Space shows through a round window above the studio rather than through a mask on the studio, and the scene
 * clips itself to the hole rather than being masked: full-screen CSS masks that change every frame cost the
 * compositor most of its frame budget on an HD 4600. The disc's radius is the middle of the masks' soft edge,
 * so the studio still gives way to space halfway across it, under the horizon's ring.
 * Once the hole covers the whole viewport, what it has swallowed is hidden outright: the studio, the scene's
 * clip and, once its inset glow is past every corner, the horizon. Nothing of them showed by then.
 */
export function blackHole(hole: number, centre: Point, view: Viewport): BlackHole {
  const maxR = Math.hypot(view.w, view.h) * 1.05;
  const rpx = hole ** 2.1 * maxR;
  const horizonOpacity = hole > 0 ? 1 - ss(0.8, 1, hole) : 0;
  if (hole <= 0) return { rpx, window: "closed", sceneClip: null, studioOpacity: 1, horizonOpacity };
  if (hole >= 1) return { rpx, window: "open", sceneClip: null, studioOpacity: 0, horizonOpacity };
  const far = farthestCorner(centre, view);
  if (rpx >= far + HOLE_EDGE_PX) {
    return {
      rpx,
      window: "open",
      sceneClip: null,
      studioOpacity: 0,
      horizonOpacity: rpx - HORIZON_REACH >= far ? 0 : horizonOpacity,
    };
  }
  return {
    rpx,
    window: { x: centre.x, y: centre.y, r: rpx + HOLE_EDGE_PX / 2 },
    sceneClip: { x: centre.x, y: centre.y, r: rpx },
    studioOpacity: 1,
    horizonOpacity,
  };
}

const LAYER_IDS = {
  hero: "hero",
  studio: "studio",
  space: "space",
  glow: "glow",
  floor: "floor",
  horizon: "horizon",
  hole: "hole",
  spaceFrame: "space-frame",
  poster: "orb-poster",
  transit: "transit",
  hud: "hud",
  toggle: "toggle",
  credit: "space-credit",
} as const;

export type Layers = Record<keyof typeof LAYER_IDS, HTMLElement> & { header: HTMLElement | null };

/** Finds the layer elements on the page, or null if the page is not the home page. */
export function findLayers(doc: Document = document): Layers | null {
  const found: Record<string, HTMLElement> = {};
  for (const [key, id] of Object.entries(LAYER_IDS)) {
    const el = doc.getElementById(id);
    if (!el) return null;
    found[key] = el;
  }
  return { header: doc.querySelector<HTMLElement>(".site-header"), ...found } as Layers;
}

/** Viewport centre of the orb poster: where the black hole opens until a 3D scene supplies the real point. */
export function posterCentre(poster: HTMLElement): Point {
  const r = poster.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Size of the box that fixed layers fill (`#studio` is one, `inset: 0`). Space is laid out in a frame of this
 * size, so it sits exactly where it would as a fixed layer of its own. Classic scrollbars make it narrower than
 * the window.
 */
export function stageSize(studio: HTMLElement): Viewport {
  const r = studio.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

/**
 * Places the window onto space (`#hole`, round unless open) and counter-moves the frame inside it, so space
 * stays put on screen while the window grows around the centre.
 */
function placeWindow(hole: HTMLElement, frame: HTMLElement, opening: BlackHole["window"], stage: Viewport): void {
  let left = 0;
  let top = 0;
  let size: Viewport = { w: 0, h: 0 };
  if (opening === "open") size = stage;
  else if (opening !== "closed") {
    left = opening.x - opening.r;
    top = opening.y - opening.r;
    size = { w: 2 * opening.r, h: 2 * opening.r };
  }
  hole.style.left = `${left}px`;
  hole.style.top = `${top}px`;
  hole.style.width = `${size.w}px`;
  hole.style.height = `${size.h}px`;
  hole.style.borderRadius = opening === "open" ? "0" : ""; // the stylesheet's 50% otherwise
  frame.style.width = `${stage.w}px`;
  frame.style.height = `${stage.h}px`;
  frame.style.transform = `translate(${-left}px, ${-top}px)`;
}

/** The glow's idle brightness, 0.8 to 1 over about five seconds; a steady 0.9 when the visitor asks for less motion. */
export const glowPulse = (time: number, calm: boolean): number => (calm ? 0.9 : 0.9 + 0.1 * Math.sin(time * 1.3));

/**
 * Writes every DOM layer for scroll position P. `time` is seconds, for the glow's idle pulse (still when `calm`, the
 * visitor's reduced-motion setting).
 * `view` is the window's inner size; `stage` the fixed layers' box (see `stageSize`).
 * `sceneLive` is true while the 3D scene draws the orb itself, so the poster steps aside.
 * `covered` is true once the page has scrolled past the track, by its real position (not the eased P): the closing
 * sections then cover the whole viewport.
 * Returns the black hole, whose `sceneClip` the 3D scene takes.
 */
export function applyPhases(
  l: Layers,
  ph: Phases,
  P: number,
  centre: Point,
  view: Viewport,
  stage: Viewport,
  cardsEnd: number,
  time: number,
  sceneLive = false,
  covered = false,
  calm = false,
): BlackHole {
  fade(l.hero, 1 - ph.heroOut);
  l.hero.style.transform = `translateY(${-ph.heroOut * 40}px)`;
  // The poster stands in for the 3D orb: it fades as the orb collapses, and hides once the scene draws the orb.
  fade(l.poster, sceneLive ? 0 : 1 - ss(2.2, 2.5, P));
  fade(l.transit, ph.transit);
  fade(l.hud, galleryChrome(ph.hudIn, P, cardsEnd));
  l.toggle.classList.toggle("on", galleryShown(ph.hudIn, P, cardsEnd));
  if (l.header) markDark(l.header, ph.onDark);

  l.glow.style.left = `${centre.x}px`;
  l.glow.style.top = `${centre.y}px`;
  // Tinted only while the scene draws the orb; the poster's glow is baked apricot, so it keeps the stylesheet's.
  paintGlow(l.glow, sceneLive ? glowBackground(paletteAt(ph.morph, ph.collapse).core) : "");
  fade(l.glow, glowPulse(time, calm) * (1 - ss(2.15, 2.55, P)) * (1 - ph.mono * 0.3));
  l.glow.style.transform = `translate(-50%,-50%) scale(${1 - ph.collapse * 0.75})`;
  l.floor.style.left = `${centre.x}px`;
  l.floor.style.top = `${centre.y + view.h * 0.27}px`;
  fade(l.floor, 1 - ss(1.8, 2.3, P));

  const bh = blackHole(ph.hole, centre, view);
  placeWindow(l.hole, l.spaceFrame, bh.window, stage);
  fade(l.studio, bh.studioOpacity);
  l.horizon.style.left = `${centre.x}px`;
  l.horizon.style.top = `${centre.y}px`;
  l.horizon.style.width = l.horizon.style.height = `${bh.rpx * 2}px`;
  fade(l.horizon, bh.horizonOpacity);
  fade(l.space, ph.space);
  l.space.style.transform = `scale(${1.1 - 0.07 * ss(2.6, cardsEnd, P)})`;
  // The deep field's credit is on screen wherever the deep field shows: in with it, gone once the closing sections
  // cover it all. It sits in a bottom corner, the last part of the studio the black hole swallows (the orb is above
  // the middle), so it stays ink over the studio and turns cream once the hole is open. The header turns earlier
  // (onDark): on a phone the bottom corner is still light for about a tenth of a screen after the top has gone dark.
  fade(l.credit, covered ? 0 : ph.space);
  markDark(l.credit, bh.window === "open");
  return bh;
}
