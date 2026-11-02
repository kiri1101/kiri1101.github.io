import { describe, expect, test } from "vitest";
import { HOLE_EDGE_PX } from "~/scene/types";
import { blackHole, fade, glowBackground, glowPulse, HORIZON_REACH, markDark } from "./phase-dom";

const stub = () => ({ style: { opacity: "", visibility: "" } }) as unknown as HTMLElement;

describe("markDark", () => {
  /** An element that records every write to its attributes. */
  const recording = () => {
    const writes: string[] = [];
    const attrs = new Set<string>();
    const el = {
      toggleAttribute(name: string, force: boolean) {
        writes.push(`${name}=${force}`);
        if (force) attrs.add(name);
        else attrs.delete(name);
        return force;
      },
    } as unknown as HTMLElement;
    return { el, writes, attrs };
  };

  test("sets and removes data-dark", () => {
    const { el, attrs } = recording();
    markDark(el, true);
    expect(attrs.has("data-dark")).toBe(true);
    markDark(el, false);
    expect(attrs.has("data-dark")).toBe(false);
  });

  test("writes only when the value changes, not every frame", () => {
    const { el, writes } = recording();
    for (const dark of [false, false, true, true, true, false, false]) markDark(el, dark);
    expect(writes).toEqual(["data-dark=false", "data-dark=true", "data-dark=false"]);
  });
});

describe("fade", () => {
  test("hides fully transparent layers", () => {
    const el = stub();
    fade(el, 0);
    expect(el.style.visibility).toBe("hidden");
    fade(el, 0.002);
    expect(el.style.visibility).toBe("hidden");
  });

  test("shows a layer again once it has any opacity", () => {
    const el = stub();
    fade(el, 0);
    fade(el, 0.5);
    expect(el.style.opacity).toBe("0.5");
    expect(el.style.visibility).toBe("visible");
  });
});

describe("blackHole", () => {
  const view = { w: 1000, h: 600 };
  const centre = { x: 500, y: 250 };
  const maxR = Math.hypot(1000, 600) * 1.05;
  /** Farthest corner from the centre: (0, 600) or (1000, 600). */
  const far = Math.hypot(500, 350);
  /** The hole value whose radius is r. */
  const holeFor = (r: number) => (r / maxR) ** (1 / 2.1);

  test("is closed and leaves the studio alone before the hole opens", () => {
    const h = blackHole(0, centre, view);
    expect(h.rpx).toBe(0);
    expect(h.window).toBe("closed");
    expect(h.sceneClip).toBeNull();
    expect(h.studioOpacity).toBe(1);
    expect(h.horizonOpacity).toBe(0);
  });

  test("while opening, a round window onto space grows from the centre and the scene draws only inside it", () => {
    const h = blackHole(0.5, centre, view);
    expect(h.rpx).toBeCloseTo(0.5 ** 2.1 * maxR);
    // The window edge sits in the middle of the old masks' 1.5 px ramp; the scene keeps their exact ramp.
    expect(h.window).toEqual({ x: 500, y: 250, r: h.rpx + HOLE_EDGE_PX / 2 });
    expect(h.sceneClip).toEqual({ x: 500, y: 250, r: h.rpx });
    expect(h.studioOpacity).toBe(1);
    expect(h.horizonOpacity).toBe(1);
  });

  test("once the hole covers every corner, the studio and the clip go, while the horizon's inset glow still shows", () => {
    const h = blackHole(holeFor(far + HOLE_EDGE_PX + 1), centre, view);
    expect(h.window).toBe("open");
    expect(h.sceneClip).toBeNull();
    expect(h.studioOpacity).toBe(0);
    expect(h.horizonOpacity).toBe(1);
    // Just short of covering, the studio still frames the hole.
    const before = blackHole(holeFor(far), centre, view);
    expect(before.window).not.toBe("open");
    expect(before.studioOpacity).toBe(1);
  });

  test("the horizon goes once its inset glow is past every corner", () => {
    expect(blackHole(holeFor(far + HORIZON_REACH - 1), centre, view).horizonOpacity).toBe(1);
    expect(blackHole(holeFor(far + HORIZON_REACH + 0.01), centre, view).horizonOpacity).toBe(0);
  });

  test("when fully open the studio is gone and the horizon faded", () => {
    const h = blackHole(1, centre, view);
    expect(h.window).toBe("open");
    expect(h.sceneClip).toBeNull();
    expect(h.studioOpacity).toBe(0);
    expect(h.horizonOpacity).toBe(0);
  });
});

describe("glowBackground", () => {
  test("tints the halo behind the orb with its core colour, as the prototype did", () => {
    expect(glowBackground([1, 0.56, 0.3])).toBe(
      "radial-gradient(50% 50% at 50% 50%, rgba(255,143,77,.6), rgba(255,143,77,.2) 42%, rgba(255,143,77,0) 70%)",
    );
    expect(glowBackground([0.33, 0.62, 1])).toContain("rgba(84,158,255,.6)");
  });
});

describe("glowPulse", () => {
  test("pulses between 0.8 and 1 over time", () => {
    const values = [0, 0.5, 1, 2, 3, 4].map((t) => glowPulse(t, false));
    expect(new Set(values).size).toBeGreaterThan(1);
    for (const v of values) expect(v).toBeGreaterThanOrEqual(0.8);
  });

  test("under reduced motion it is the same at every moment", () => {
    expect(new Set([0, 0.5, 1, 2, 3, 4].map((t) => glowPulse(t, true)))).toEqual(new Set([0.9]));
  });
});
