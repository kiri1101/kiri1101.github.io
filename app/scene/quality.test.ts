import { describe, expect, test } from "vitest";
import {
  adaptiveQuality,
  frameMeter,
  nextTierFromStats,
  pickTier,
  RENDER_SCALE,
  STARTUP_WINDOWS,
  type FrameReport,
} from "./quality";

describe("frameMeter (the page's own frames, which share the GPU with a scene drawn in a worker)", () => {
  test("gives the median interval since it was last read, then starts over", () => {
    const m = frameMeter();
    for (let i = 0; i < 30; i++) m.add(34);
    for (let i = 0; i < 31; i++) m.add(30);
    expect(m.take()).toBe(30);
    expect(m.take()).toBeNull();
    for (let i = 0; i < 20; i++) m.add(16);
    expect(m.take()).toBe(16);
  });

  test("a few one-off slow frames (a decode, a re-render) do not move the reading", () => {
    const m = frameMeter();
    for (let i = 0; i < 50; i++) m.add(16.7);
    for (let i = 0; i < 10; i++) m.add(120);
    expect(m.take()).toBe(16.7);
  });

  test("leaves out pauses (a hidden tab, a debugger), as the scene's statistics do", () => {
    const m = frameMeter();
    for (let i = 0; i < 20; i++) m.add(20);
    m.add(900);
    m.add(0);
    expect(m.take()).toBe(20);
  });

  test("too few frames to judge give no reading", () => {
    const m = frameMeter();
    for (let i = 0; i < 9; i++) m.add(40);
    expect(m.take()).toBeNull();
  });
});

describe("pickTier", () => {
  const capable = { reducedMotion: false, webgl: true, saveData: false };

  test("a capable browser starts at full quality", () => {
    expect(pickTier(capable)).toBe(0);
  });

  test("reduced motion, no WebGL or save-data each get the still poster and the list (tier 2)", () => {
    expect(pickTier({ reducedMotion: true, webgl: true, saveData: false })).toBe(2);
    expect(pickTier({ ...capable, webgl: false })).toBe(2);
    expect(pickTier({ ...capable, saveData: true })).toBe(2);
  });
});

describe("nextTierFromStats", () => {
  test("slow frames step down one tier once the last change is 2 s old", () => {
    expect(nextTierFromStats(0, 30, 2500)).toBe(1);
    expect(nextTierFromStats(0, 22.1, 2000)).toBe(1);
  });

  test("never sooner than 2 s after the last change", () => {
    expect(nextTierFromStats(1, 30, 500)).toBe(1);
    expect(nextTierFromStats(0, 30, 1999)).toBe(0);
    expect(nextTierFromStats(1, 45, 1999, true)).toBe(1);
  });

  test("never steps up, and frames at 22 ms or faster change nothing", () => {
    expect(nextTierFromStats(1, 10, 9999)).toBe(1);
    expect(nextTierFromStats(0, 22, 9999)).toBe(0);
    expect(nextTierFromStats(0, 8, 9999)).toBe(0);
  });

  test("tier 1 → 2 (the poster) only in start-up, on frames over 40 ms (Ruling R29)", () => {
    expect(nextTierFromStats(1, 45, 2500, true)).toBe(2);
    expect(nextTierFromStats(1, 30, 2500, true)).toBe(1);
    expect(nextTierFromStats(1, 40, 2500, true)).toBe(1);
    expect(nextTierFromStats(1, 45, 2500, false)).toBe(1);
    expect(nextTierFromStats(1, 45, 2500)).toBe(1);
    expect(nextTierFromStats(1, 200, 99_999)).toBe(1);
  });

  test("one tier at a time, and tier 2 stays", () => {
    expect(nextTierFromStats(0, 200, 99_999, true)).toBe(1);
    expect(nextTierFromStats(2, 200, 99_999, true)).toBe(2);
  });
});

describe("adaptiveQuality", () => {
  /** A governor on a hand-driven clock. */
  function harness(start: 0 | 1 = 0) {
    let now = 0;
    const q = adaptiveQuality(start, () => now);
    return { q, at: (ms: number) => (now = ms) };
  }
  /** A steady-state report from a scene on the main thread, the visitor past the hero. */
  const r = (sceneMs: number, more: Partial<FrameReport> = {}): FrameReport => ({
    sceneMs,
    steady: true,
    pageMs: null,
    inHero: false,
    ...more,
  });

  test("the first report after going live is warm-up (build, first draws, texture uploads) and changes nothing", () => {
    const { q, at } = harness();
    at(3000);
    expect(q.report(r(80))).toBeNull();
    expect(q.tier).toBe(0);
  });

  test("steady slow frames then step down to tier 1, and only once", () => {
    const { q, at } = harness();
    at(2000);
    q.report(r(33)); // warm-up
    at(4000);
    expect(q.report(r(33))).toBe(1);
    expect(q.tier).toBe(1);
    at(9000);
    expect(q.report(r(33))).toBeNull(); // the window that straddled the change
    at(12_000);
    expect(q.report(r(40))).toBeNull();
    expect(q.tier).toBe(1);
  });

  test("the 2 s hold counts from going live", () => {
    const { q, at } = harness();
    at(900);
    q.report(r(30)); // warm-up
    at(1800);
    expect(q.report(r(30))).toBeNull(); // live for 1.8 s only
    at(2700);
    expect(q.report(r(30))).toBe(1);
  });

  test("fast frames keep full quality", () => {
    const { q, at } = harness();
    for (let t = 1000; t <= 20_000; t += 1000) {
      at(t);
      expect(q.report(r(16.7))).toBeNull();
    }
    expect(q.tier).toBe(0);
  });

  test("restart (a scene rebuilt after a lost context) keeps the tier and warms up again", () => {
    const { q, at } = harness();
    at(2000);
    q.report(r(30));
    at(4000);
    expect(q.report(r(30))).toBe(1);
    at(20_000);
    q.restart();
    expect(q.tier).toBe(1);
    at(30_000);
    expect(q.report(r(30))).toBeNull();
  });

  describe("the page's frames, when the scene renders in a worker", () => {
    test("slow page frames step down too", () => {
      const { q, at } = harness();
      at(2000);
      q.report(r(16.7, { pageMs: 35 })); // warm-up
      at(4000);
      expect(q.report(r(16.7, { pageMs: 35 }))).toBe(1);
    });

    test("slow page frames that fall only in an upload window do not step down", () => {
      const { q, at } = harness();
      at(2000);
      q.report(r(16.7, { pageMs: 16.7 })); // warm-up
      at(4000);
      // The scene left its upload frames out of the window (not steady); the page's frames over it carried them.
      expect(q.report(r(16.7, { steady: false, pageMs: 60 }))).toBeNull();
      at(6000);
      expect(q.report(r(16.7, { pageMs: 16.7 }))).toBeNull();
      expect(q.tier).toBe(0);
    });

    test("on the main thread there is no separate page reading: the scene's frames are the page's", () => {
      const { q, at } = harness();
      at(2000);
      q.report(r(16.7)); // warm-up
      at(4000);
      expect(q.report(r(16.7, { pageMs: null }))).toBeNull();
      expect(q.tier).toBe(0);
    });
  });

  describe("start-up in the hero: the poster for a device too slow even at tier 1 (Ruling R29)", () => {
    /** A device at `ms` per frame that stays in the hero: one report every 60 frames. */
    function run(ms: number, inHero: (window: number) => boolean = () => true) {
      const { q, at } = harness();
      const tiers: number[] = [];
      for (let w = 1; w <= 12; w++) {
        at(w * 60 * ms);
        q.report(r(ms, { inHero: inHero(w) }));
        tiers.push(q.tier);
      }
      return tiers;
    }

    test("frames over 40 ms at tier 1, still in the hero: tier 2", () => {
      const tiers = run(50);
      expect(tiers.at(-1)).toBe(2);
      expect(tiers.indexOf(2)).toBeLessThanOrEqual(STARTUP_WINDOWS - 1);
      expect(tiers.indexOf(1)).toBeLessThan(tiers.indexOf(2)); // one tier at a time
    });

    test("the poster needs two slow windows in a row at tier 1: one spike does not take the scene away", () => {
      const { q, at } = harness(1);
      at(3000);
      q.report(r(30, { inHero: true })); // warm-up
      at(6000);
      expect(q.report(r(55, { inHero: true }))).toBeNull(); // one slow window
      at(9000);
      expect(q.report(r(30, { inHero: true }))).toBeNull();
      at(12_000);
      expect(q.report(r(55, { inHero: true }))).toBeNull(); // not in a row
      at(15_000);
      expect(q.report(r(55, { inHero: true }))).toBe(2);
    });

    test("slow page frames alone never take the scene away: the poster is judged by the scene's own frames", () => {
      // From a worker on an HD 4600 the page's frames sit at 33.3 ms (vsync steps) and can dip to 50 ms, while the
      // scene draws at 18 ms.
      const { q, at } = harness(1);
      for (let w = 1; w <= STARTUP_WINDOWS; w++) {
        at(w * 1200);
        expect(q.report(r(18, { pageMs: 50, inHero: true }))).toBeNull();
      }
      expect(q.tier).toBe(1);
    });

    test("frames between 22 and 40 ms (an HD 4600 on the main thread): tier 1 and no further", () => {
      expect(run(33).at(-1)).toBe(1);
    });

    test("a visitor who has left the hero keeps the scene: tier 1 is the floor", () => {
      expect(run(50, (w) => w < 2).at(-1)).toBe(1);
    });

    test("after start-up, tier 1 is the floor even in the hero", () => {
      const { q, at } = harness(1);
      for (let w = 1; w <= STARTUP_WINDOWS; w++) {
        at(w * 1000);
        q.report(r(30, { inHero: true }));
      }
      at(60_000);
      expect(q.report(r(60, { inHero: true }))).toBeNull();
      expect(q.tier).toBe(1);
    });
  });
});

test("tier 1 renders at 0.75 of the device pixel ratio; tier 0 at full", () => {
  expect(RENDER_SCALE[0]).toBe(1);
  expect(RENDER_SCALE[1]).toBe(0.75);
});
