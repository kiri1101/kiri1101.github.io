/**
 * Adaptive quality (spec §6 rule 6): which tier the page starts at, and when frame times step it down.
 * No DOM and no three.js, so the rules are unit-tested (quality.test.ts) and the host imports them eagerly.
 *
 * - Tier 0: full quality.
 * - Tier 1: the scene at a lower render resolution and with fewer particles (orb, frost and stars). Tier steps act
 *   on the scene only, never on the DOM layers, whose cost the tier cannot change (Ruling R25).
 * - Tier 2: no WebGL: the still poster, and the list view in place of the spiral.
 */
import type { Tier } from "./types";

export type QualityEnv = { reducedMotion: boolean; webgl: boolean; saveData: boolean };

/** Reduced motion, no capable WebGL (none, or only in software) and save-data each mean tier 2. */
export function pickTier(env: QualityEnv): Tier {
  return env.reducedMotion || !env.webgl || env.saveData ? 2 : 0;
}

/** A frame interval above this (about 45 fps) is slow: tier 0 → 1. */
export const SLOW_FRAME_MS = 22;
/** Above this (under 25 fps) even tier 1 is too slow: tier 1 → 2, during start-up only (Ruling R29). */
export const STILL_FRAME_MS = 40;
/** At least this long between tier changes (and after going live), so one change can show its effect first. */
export const TIER_HOLD_MS = 2000;
/**
 * Start-up: the first stats windows after the scene first goes live (60 frames each, warm-up included), while the
 * visitor has stayed in the hero. Enough for warm-up, 0 → 1, the window that straddles it, and 1 → 2.
 */
export const STARTUP_WINDOWS = 6;

/**
 * Steps down one tier when frames are slow and the last change is at least TIER_HOLD_MS old; never steps up.
 * - 0 → 1 above SLOW_FRAME_MS. On an HD 4600 the hero runs near 30 fps at tier 0 on the main thread, so it settles
 *   at tier 1.
 * - 1 → 2 (the poster) only during start-up (`startUp`), above STILL_FRAME_MS: a device too slow even at tier 1 gets
 *   the still image (spec §6.6), while the poster is still the orb's own picture. After that, tier 1 is the floor:
 *   phases bound by the page's own painting (the black hole's horizon) must not lose the scene.
 */
export function nextTierFromStats(current: Tier, avgFrameMs: number, msSinceLastChange: number, startUp = false): Tier {
  if (msSinceLastChange < TIER_HOLD_MS) return current;
  if (current === 0 && avgFrameMs > SLOW_FRAME_MS) return 1;
  if (current === 1 && startUp && avgFrameMs > STILL_FRAME_MS) return 2;
  return current;
}

/** Frame intervals longer than this are pauses (a hidden tab, a debugger), not slow frames, as in the scene. */
const PAUSE_MS = 250;
/** Fewer frames than this between two readings say nothing. */
const MIN_FRAMES = 10;

/**
 * The median of the page's own frame intervals between readings. When the scene renders in a worker, the page's
 * frames (the DOM layers) share the GPU with it and can run slower than the scene's, and the visitor sees both. The
 * median, so one-off work on the page (a decode, a re-render) does not count as slow frames.
 */
export function frameMeter() {
  let samples: number[] = [];
  return {
    add(intervalMs: number): void {
      if (intervalMs <= 0 || intervalMs > PAUSE_MS) return;
      samples.push(intervalMs);
    },
    /** The median since the last reading, or null when too few frames were seen; then it starts over. */
    take(): number | null {
      const sorted = samples.sort((a, b) => a - b);
      samples = [];
      if (sorted.length < MIN_FRAMES) return null;
      const mid = sorted.length >> 1;
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    },
  };
}

/** The scene's drawing-buffer scale per tier, applied to the device pixel ratio (capped at 2). */
export const RENDER_SCALE: Record<Tier, number> = { 0: 1, 1: 0.75, 2: 0.75 };

/** One stats report: the scene's window of 60 frames, and what the host saw over the same stretch. */
export type FrameReport = {
  /** The scene's mean frame interval (SceneHandle.onStats); it leaves out upload frames and pauses. */
  sceneMs: number;
  /**
   * False when the scene left frames out of that window (a texture upload, a pause): the page's frames over the same
   * stretch carried that work too, so they are not read.
   */
  steady: boolean;
  /**
   * The page's own frames over the same stretch (frameMeter), when the scene renders in a worker; null on the main
   * thread, where the scene's frames are the page's.
   */
  pageMs: number | null;
  /** The visitor is still in the hero, where the poster can replace the orb without a jump (ORB_STILL_UNTIL). */
  inHero: boolean;
};

/** Windows in a row over STILL_FRAME_MS before tier 1 gives way to the poster: that step cannot be undone. */
const STILL_WINDOWS = 2;

/**
 * The host's governor: feeds each stats report to nextTierFromStats. Only steady-state frames count: the first report
 * after the scene goes live covers the build's first draws and the card texture uploads, and the first report after
 * a change straddles both tiers, so each is skipped.
 * - 0 → 1 is judged by the slower of the scene's frames and, when the scene renders in a worker and the window is
 *   steady, the page's: the visitor sees both.
 * - 1 → 2 takes the scene away, so it is judged by the scene's own average frame (Ruling R29), over STILL_WINDOWS
 *   windows in a row. The page's frames next to a worker come in vsync steps (33.3 ms, then 50) and can dip for a
 *   window while the scene itself is fast.
 * `now` is a clock in milliseconds.
 */
export function adaptiveQuality(start: Tier, now: () => number = () => performance.now()) {
  let tier = start;
  let since = now();
  let warmingUp = true;
  /** Reports since the scene first went live, and whether the visitor has left the hero meanwhile (start-up). */
  let windows = 0;
  let leftHero = false;
  /** Windows in a row at tier 1 whose scene frames were over STILL_FRAME_MS. */
  let stillRun = 0;

  return {
    get tier(): Tier {
      return tier;
    },

    /** One stats report; returns the new tier when it changes, else null. */
    report(r: FrameReport): Tier | null {
      windows++;
      if (!r.inHero) leftHero = true;
      if (warmingUp) {
        warmingUp = false;
        return null;
      }
      const startUp = !leftHero && windows <= STARTUP_WINDOWS;
      let next: Tier;
      if (tier === 0) {
        const ms = r.steady && r.pageMs !== null ? Math.max(r.sceneMs, r.pageMs) : r.sceneMs;
        next = nextTierFromStats(tier, ms, now() - since, startUp);
      } else {
        stillRun = r.sceneMs > STILL_FRAME_MS ? stillRun + 1 : 0;
        next = stillRun >= STILL_WINDOWS ? nextTierFromStats(tier, r.sceneMs, now() - since, startUp) : tier;
      }
      if (next === tier) return null;
      tier = next;
      since = now();
      warmingUp = true;
      stillRun = 0;
      return tier;
    },

    /** A scene rebuilt at the current tier (after a lost context) went live: warm up and hold again. */
    restart(): void {
      since = now();
      warmingUp = true;
    },
  };
}
