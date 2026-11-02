import { describe, expect, test } from "vitest";
import { scrollForProject, phasesAt } from "~/lib/timeline";
import { cardsOnScreen } from "./cards";
import { RAMP_FRAMES, RAMP_MS, rampStep } from "./ramp";

describe("the fade-in of a scene that starts past the hero", () => {
  /** The fade at each frame of a run at a steady frame interval, until it is done. */
  const run = (intervalMs: number) => {
    const fades: number[] = [];
    for (let n = 1; fades.at(-1) !== 1; n++) fades.push(rampStep(fades.at(-1) ?? 0, (n - 1) * intervalMs));
    return fades;
  };

  test("at 60 fps it lasts at least RAMP_MS, a few percent of the light per frame", () => {
    const fades = run(1000 / 60);
    expect((fades.length - 1) * (1000 / 60)).toBeGreaterThanOrEqual(RAMP_MS - 1000 / 60);
    const steps = fades.map((f, i) => f - (fades[i - 1] ?? 0));
    expect(Math.max(...steps)).toBeLessThanOrEqual(0.06);
  });

  test("on a slow device (100 ms frames) it still takes at least RAMP_FRAMES frames: no step above a tenth", () => {
    const fades = run(100);
    expect(fades.length).toBeGreaterThanOrEqual(RAMP_FRAMES);
    const steps = fades.map((f, i) => f - (fades[i - 1] ?? 0));
    expect(Math.max(...steps)).toBeLessThanOrEqual(1 / RAMP_FRAMES + 1e-9);
  });

  test("it never goes past 1", () => {
    expect(rampStep(0.99, 1e6)).toBe(1);
  });
});

describe("the cards a scene starting in the galaxy shows in its first frame", () => {
  test("the focused project's card and its neighbours on screen", () => {
    for (const i of [0, 2, 5, 11]) {
      const on = cardsOnScreen(phasesAt(scrollForProject(i)).cardOffset, 12);
      expect(on, `project ${i}`).toContain(i);
      expect(on.length).toBeLessThanOrEqual(4);
      expect(Math.max(...on) - Math.min(...on)).toBeLessThanOrEqual(3);
    }
  });

  test("none before the first card comes out of the core", () => {
    expect(cardsOnScreen(phasesAt(2.0).cardOffset, 12)).toEqual([]);
  });
});
