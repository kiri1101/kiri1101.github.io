import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { afterFirstPaint } from "./after-first-paint";

const paint = [{ name: "first-contentful-paint" }] as PerformanceEntryList;

/** A PerformanceObserver that supports paint timing and lets the test deliver entries. */
function fakeObserver() {
  const observers: { deliver(entries: PerformanceEntryList): void }[] = [];
  class FakeObserver {
    static supportedEntryTypes = ["paint"];
    constructor(private cb: (list: { getEntries(): PerformanceEntryList }) => void) {
      observers.push({ deliver: (entries) => this.cb({ getEntries: () => entries }) });
    }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("PerformanceObserver", FakeObserver);
  return observers;
}

describe("afterFirstPaint", () => {
  let frames: FrameRequestCallback[];
  const nextFrame = () => frames.splice(0).forEach((cb) => cb(0));

  beforeEach(() => {
    vi.useFakeTimers();
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      frames[id - 1] = () => undefined;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("without paint timing it runs after two frames, and only once", () => {
    vi.stubGlobal("PerformanceObserver", undefined);
    const cb = vi.fn();
    afterFirstPaint(cb);
    nextFrame();
    vi.advanceTimersByTime(1);
    expect(cb).not.toHaveBeenCalled();
    nextFrame();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000); // the cap does not run it again
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("when no paint is ever reported it runs at the cap (2 s by default)", () => {
    fakeObserver();
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
    const cb = vi.fn();
    afterFirstPaint(cb);
    vi.advanceTimersByTime(1999);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("a paint already recorded runs it on the next task; an observed paint runs it once", () => {
    fakeObserver();
    vi.spyOn(performance, "getEntriesByType").mockReturnValue(paint);
    const early = vi.fn();
    afterFirstPaint(early);
    expect(early).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(early).toHaveBeenCalledTimes(1);

    vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
    const observers = fakeObserver();
    const late = vi.fn();
    afterFirstPaint(late);
    observers[0].deliver(paint);
    observers[0].deliver(paint);
    vi.advanceTimersByTime(3000);
    expect(late).toHaveBeenCalledTimes(1);
  });

  test("cancelling stops it, whichever way it would have run", () => {
    vi.stubGlobal("PerformanceObserver", undefined);
    const cb = vi.fn();
    const cancel = afterFirstPaint(cb);
    cancel();
    nextFrame();
    nextFrame();
    vi.advanceTimersByTime(5000);
    expect(cb).not.toHaveBeenCalled();
  });
});
