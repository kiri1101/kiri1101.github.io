// The main-thread build racing a page that leaves (Task 8, B6): what is made is freed exactly once. three.js is
// replaced by a build the test finishes by hand; the canvas and its WebGL context are fakes that keep score.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { sceneLifecycle } from "./lifecycle";
import type { CardInput, SceneHandle } from "./types";

const build = vi.hoisted(() => ({ resolve: null as null | ((scene: unknown) => void), calls: 0 }));
vi.mock("./scene", () => ({
  createScene: () => {
    build.calls++;
    return new Promise((resolve) => (build.resolve = resolve));
  },
}));
const { mountScene, releaseCanvas } = await import("./mount");

/** A WebGL context as the spec has it: once lost, getExtension answers null, so a second loss is impossible. */
class FakeGL {
  lost = false;
  losses = 0;
  isContextLost() {
    return this.lost;
  }
  getExtension(name: string) {
    if (this.lost || name !== "WEBGL_lose_context") return null;
    return {
      loseContext: () => {
        this.lost = true;
        this.losses++;
      },
    };
  }
}

/** The page's canvas: getContext gives the same context every time, as a real canvas does. */
class FakeCanvas {
  isConnected = true;
  clientWidth = 800;
  clientHeight = 600;
  gl = new FakeGL();
  getContext() {
    return this.gl;
  }
}

const opts = { tier: 0 as const, small: false, monogram: "LM", cards: [] as CardInput[], allowSoftwareGL: true };
const settle = () => new Promise((r) => setTimeout(r, 0));
const fakeScene = () => ({ dispose: vi.fn() }) as unknown as SceneHandle & { dispose: ReturnType<typeof vi.fn> };

/**
 * Starts a main-thread mount and waits until three.js has "arrived" and the scene is being built. The mount's
 * promise comes back wrapped, so awaiting this does not wait for the build.
 */
async function mountUntilBuilding(canvas: FakeCanvas) {
  const mounted = mountScene(canvas as unknown as HTMLCanvasElement, opts);
  await vi.waitFor(() => expect(build.resolve).not.toBeNull());
  return { mounted };
}

beforeEach(() => {
  build.resolve = null;
  build.calls = 0;
  vi.stubGlobal("window", { devicePixelRatio: 1 });
  vi.stubGlobal("Worker", undefined); // no worker path: the main thread builds
  vi.stubGlobal("OffscreenCanvas", class {});
  vi.stubGlobal("document", {
    createElement: () => new FakeCanvas(), // the availability check's throwaway canvas
    fonts: { load: () => Promise.resolve([]) },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("a main-thread build that finishes after the page has left (B6, second path)", () => {
  test("released while the scene is built: the scene is disposed once and the context lost once; nothing goes live", async () => {
    const canvas = new FakeCanvas();
    const { mounted } = await mountUntilBuilding(canvas);
    // The page leaves (useScene's cleanup): the context the build is using is lost at once.
    releaseCanvas(canvas as unknown as HTMLCanvasElement);
    expect(canvas.gl.losses).toBe(1);
    const scene = fakeScene();
    build.resolve!(scene);
    expect(await mounted).toBeNull();
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(canvas.gl.losses).toBe(1);
  });

  test("taken off the page without a release: the scene is disposed and its context lost, each once", async () => {
    const canvas = new FakeCanvas();
    const { mounted } = await mountUntilBuilding(canvas);
    canvas.isConnected = false;
    const scene = fakeScene();
    build.resolve!(scene);
    expect(await mounted).toBeNull();
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(canvas.gl.losses).toBe(1);
  });

  test("through the lifecycle, as useScene runs it: stopped mid-build, the late scene is disposed by the mount alone", async () => {
    const canvas = new FakeCanvas();
    const live = vi.fn();
    const failed = vi.fn();
    const life = sceneLifecycle<SceneHandle>({
      build: () => mountScene(canvas as unknown as HTMLCanvasElement, opts),
      live,
      off: vi.fn(),
      failed,
    });
    const started = life.start();
    await vi.waitFor(() => expect(build.resolve).not.toBeNull());
    life.stop();
    releaseCanvas(canvas as unknown as HTMLCanvasElement);
    const scene = fakeScene();
    build.resolve!(scene);
    await started;
    await settle();
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(canvas.gl.losses).toBe(1);
    expect(live).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(life.scene).toBeNull();
  });
});
