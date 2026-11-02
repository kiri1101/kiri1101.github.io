import { describe, expect, test, vi } from "vitest";
import { sceneLifecycle } from "./lifecycle";

type Fake = { id: number; dispose: ReturnType<typeof vi.fn<() => void>> };

/** A lifecycle whose builds the test resolves or rejects by hand, in any order. */
function harness() {
  const builds: { resolve(s: Fake | null): void; reject(e: unknown): void; isCurrent: () => boolean }[] = [];
  let next = 0;
  const live = vi.fn();
  const off = vi.fn();
  const failed = vi.fn();
  const life = sceneLifecycle<Fake>({
    build: (isCurrent) =>
      new Promise<Fake | null>((resolve, reject) => {
        builds.push({ resolve, reject, isCurrent });
      }),
    live,
    off,
    failed,
  });
  const scene = (): Fake => ({ id: ++next, dispose: vi.fn<() => void>() });
  const settle = () => new Promise((r) => setTimeout(r, 0));
  return { life, builds, live, off, failed, scene, settle };
}

describe("sceneLifecycle", () => {
  test("a scene that builds goes live", async () => {
    const h = harness();
    void h.life.start();
    const s = h.scene();
    h.builds[0].resolve(s);
    await h.settle();
    expect(h.live).toHaveBeenCalledWith(s);
    expect(h.life.scene).toBe(s);
    expect(h.off).not.toHaveBeenCalled();
  });

  test("a context lost while the scene is built: that build never goes live, and the restore builds again (R22)", async () => {
    const h = harness();
    void h.life.start();
    h.life.lost(); // the poster comes back at once
    expect(h.off).toHaveBeenCalledTimes(1);
    expect(h.builds[0].isCurrent()).toBe(false);

    const stale = h.scene();
    h.builds[0].resolve(stale); // the build completes anyway, on the dead context
    await h.settle();
    expect(h.live).not.toHaveBeenCalled();
    expect(stale.dispose).toHaveBeenCalledTimes(1);
    expect(h.life.scene).toBeNull();

    void h.life.restored();
    expect(h.builds).toHaveLength(2);
    const fresh = h.scene();
    h.builds[1].resolve(fresh);
    await h.settle();
    expect(h.live).toHaveBeenCalledWith(fresh);
    expect(h.life.scene).toBe(fresh);
  });

  test("a stale build that fails after the restore's scene is up leaves that scene alone", async () => {
    const h = harness();
    void h.life.start();
    h.life.lost();
    void h.life.restored();
    const fresh = h.scene();
    h.builds[1].resolve(fresh);
    await h.settle();
    expect(h.live).toHaveBeenCalledWith(fresh);

    h.builds[0].reject(new Error("The WebGL context was lost while the scene was being built"));
    await h.settle();
    expect(h.failed).toHaveBeenCalledWith(expect.any(Error), true);
    expect(fresh.dispose).not.toHaveBeenCalled();
    expect(h.off).toHaveBeenCalledTimes(1); // only the loss's
    expect(h.life.scene).toBe(fresh);
  });

  test("a current build that fails falls back to the poster", async () => {
    const h = harness();
    void h.life.start();
    h.builds[0].reject(new Error("no WebGL"));
    await h.settle();
    expect(h.failed).toHaveBeenCalledWith(expect.any(Error), false);
    expect(h.off).toHaveBeenCalledTimes(1);
  });

  test("the scene is built again once per page, and never while one is up", async () => {
    const h = harness();
    void h.life.start();
    h.builds[0].resolve(h.scene());
    await h.settle();
    expect(h.life.restored()).toBeUndefined(); // a scene is up
    h.life.lost();
    void h.life.restored();
    h.builds[1].resolve(h.scene());
    await h.settle();
    h.life.lost();
    expect(h.life.restored()).toBeUndefined(); // the one rebuild is spent: the poster stays
    expect(h.builds).toHaveLength(2);
  });

  test("after stop, a build that completes is disposed and the scene that was up too", async () => {
    const h = harness();
    void h.life.start();
    const up = h.scene();
    h.builds[0].resolve(up);
    await h.settle();
    h.life.lost();
    void h.life.restored();
    h.life.stop();
    expect(up.dispose).toHaveBeenCalledTimes(1);
    const late = h.scene();
    h.builds[1].resolve(late);
    await h.settle();
    expect(late.dispose).toHaveBeenCalledTimes(1);
    expect(h.live).toHaveBeenCalledTimes(1);
  });
});
