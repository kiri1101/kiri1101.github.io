/** The 3D scene's contract with its host page: types, plus the constants both sides honour. No DOM, no three.js. */
import { FONT_URLS } from "../lib/assets";

/**
 * 0: full quality. 1: render scale 0.75, orb 14 000 points, frost 1 200, stars 9 000 (phones: 4 000).
 * 2: no WebGL: the host keeps the poster and shows the list view. See quality.ts.
 */
export type Tier = 0 | 1 | 2;

/**
 * One project card: its texture (the cover at CARD_TEXTURE size, `card.avif` with a `card.webp` sibling), and
 * the accent gradient it shows if the texture cannot be loaded.
 */
export type CardInput = { slug: string; image: string; accent: { from: string; to: string } };

/**
 * Pixel size of a card texture. The files are made at exactly this size (`npm run card-textures`), so the
 * browser decodes them off the main thread with no resize or flip; it is sharp at the focused card's size.
 */
export { CARD_TEXTURE } from "../lib/images";

/** A circle in CSS pixels of the viewport, which the canvas fills: centre and radius. */
export type Circle = { x: number; y: number; r: number };

/**
 * Width of the black hole's soft edge in CSS pixels: the prototype's masks ramped from clear to opaque over it.
 * The DOM's window onto space has its rim in the middle of it, the scene's clip fades out across it, and the
 * horizon's 1.5 px ring covers it.
 */
export const HOLE_EDGE_PX = 1.5;

export type SceneOptions = {
  /** Canvas client size in CSS pixels (its content box, not the window). */
  width: number;
  height: number;
  dpr: number;
  tier: Tier;
  /** The prototype's phone layout (viewport ≤ 760 px wide): fewer points, a farther camera. */
  small: boolean;
  /** Letters the orb morphs into, e.g. "LM". */
  monogram: string;
  /**
   * The monogram's letters already rasterised with MONOGRAM_FONT (GLYPHS_SIZE): handed over by a host whose
   * worker cannot load fonts. Without it the scene rasterises `monogram` itself.
   */
  glyphs?: ImageData;
  cards: CardInput[];
  /**
   * Test-only: accept software or blocklisted WebGL (see `sceneContextAttributes`). Never set in production;
   * the scene e2e and the poster script opt in because headless Chromium only has SwiftShader.
   */
  allowSoftwareGL?: boolean;
};

export interface SceneHandle {
  /** Smoothed scroll position in viewport heights; the scene does not smooth it again. Drawing starts after the first call. */
  setProgress(P: number): void;
  /** Pointer offset from the viewport centre, each axis in -0.5..0.5. */
  setPointer(x: number, y: number): void;
  /** New canvas client size in CSS pixels; a call with an unchanged size and ratio does nothing. */
  resize(width: number, height: number, dpr: number): void;
  setTier(t: Tier): void;
  /**
   * The circle the scene may draw in, with a soft edge of HOLE_EDGE_PX outside it; null draws everywhere. The host sets it while the black hole opens: stars only inside the hole.
   * It applies from the next frame drawn.
   */
  setClip(clip: Circle | null): void;
  /**
   * The orb core's projected position in CSS pixels of the canvas, reported whenever it moves: from the first frame
   * presented, or for a fade-in from the frame before it, so the host's layers are on the core from its first frame.
   * `settled` turns true, with a report of its own, once the scene is fully up, its fade-in done; until then the host
   * keeps the poster.
   */
  onCore(cb: (x: number, y: number, settled: boolean) => void): void;
  /**
   * While on, a scene that has not drawn yet gets its first frame ready (its fade-in armed, the visible cards'
   * textures on their way) but presents nothing: the host holds it while a page transition runs (Ruling R35). Off
   * (the default), that frame is presented. A scene that is drawing already ignores it.
   */
  hold(on: boolean): void;
  /**
   * Mean frame interval in milliseconds over each run of 60 steady-state frames: frames after a texture upload and
   * pauses are left out. `steady` is false when the run left any out, so other work over the same stretch (the page's
   * own frames) carried one-off work too.
   */
  onStats(cb: (avgFrameMs: number, steady: boolean) => void): void;
  /** Stops drawing, clears the canvas and frees every GPU resource. */
  dispose(): void;
}

/**
 * The font the monogram is rasterised with. The scene cannot load fonts itself (it must not touch the DOM): on the
 * main thread the host loads this face from the page's stylesheet before calling `createScene`; a worker loads
 * MONOGRAM_FONT_FACE into its own font set, or is handed the letters already rasterised (`SceneOptions.glyphs`).
 */
export const MONOGRAM_FONT = '600 270px "Inter Tight"';

/**
 * The face behind MONOGRAM_FONT, as tokens.css declares it (geometry.test.ts checks they agree). The file is the
 * page's preloaded body face, so a worker loading it hits the HTTP cache.
 */
export const MONOGRAM_FONT_FACE = {
  family: "Inter Tight",
  url: FONT_URLS.interTight,
  weight: "100 900",
} as const;

/** Size of the canvas the monogram's letters are rasterised on (`monogramGlyphs` in geometry.ts). */
export const GLYPHS_SIZE = { width: 640, height: 300 } as const;
