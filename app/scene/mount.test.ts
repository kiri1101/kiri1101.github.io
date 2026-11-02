import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { rendersInWorker, workerHost } from "./mount";
import type { FromWorker, ToWorker } from "./scene.worker";
import type { CardInput } from "./types";

/** A worker that records what the page posts, and replies when the test says so. */
class FakeWorker extends EventTarget {
  posted: ToWorker[] = [];
  terminated = false;
  postMessage(message: ToWorker) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: FromWorker) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
  types() {
    return this.posted.map((m) => m.type);
  }
}

/** The page's canvas: a client box, and a transfer that can happen only once. */
class FakeCanvas extends EventTarget {
  clientWidth = 800;
  clientHeight = 600;
  transfers = 0;
  transferControlToOffscreen() {
    this.transfers++;
    return { offscreen: this.transfers };
  }
}

const opts = { tier: 0 as const, small: false, monogram: "LM", cards: [] as CardInput[] };
const settle = () => new Promise((r) => setTimeout(r, 0));

function harness() {
  const worker = new FakeWorker();
  const canvas = new FakeCanvas();
  const host = workerHost(canvas as unknown as HTMLCanvasElement, worker as unknown as Worker, true);
  return { worker, canvas, host };
}

beforeEach(() => vi.stubGlobal("window", { devicePixelRatio: 1 }));
afterEach(() => vi.unstubAllGlobals());

describe("workerHost", () => {
  test("builds in the worker: the canvas goes with the first init only, and ready gives a worker scene", async () => {
    const { worker, canvas, host } = harness();
    const first = host.build(opts);
    const init = worker.posted[0] as Extract<ToWorker, { type: "init" }>;
    expect(init).toMatchObject({ type: "init", id: 1, options: { width: 800, height: 600, dpr: 1 } });
    expect(init.canvas).toBeDefined();
    worker.reply({ type: "ready", id: 1 });
    const scene = await first;
    expect(scene).not.toBeNull();
    expect(rendersInWorker(scene!)).toBe(true);

    scene!.dispose();
    void host.build(opts);
    const second = worker.posted.at(-1) as Extract<ToWorker, { type: "init" }>;
    expect(second).toMatchObject({ type: "init", id: 2 });
    expect(second.canvas).toBeUndefined();
    expect(canvas.transfers).toBe(1);
  });

  test("replies about a stale build are dropped: core and stats reach only the scene that is up", async () => {
    const { worker, host } = harness();
    const pending = host.build(opts);
    worker.reply({ type: "ready", id: 1 });
    const scene = (await pending)!;
    const core = vi.fn();
    const stats = vi.fn();
    scene.onCore(core);
    scene.onStats(stats);
    worker.reply({ type: "core", id: 7, x: 1, y: 2, settled: true });
    worker.reply({ type: "stats", id: 7, avgFrameMs: 30, steady: true });
    expect(core).not.toHaveBeenCalled();
    expect(stats).not.toHaveBeenCalled();
    worker.reply({ type: "core", id: 1, x: 3, y: 4, settled: false });
    worker.reply({ type: "stats", id: 1, avgFrameMs: 16, steady: false });
    expect(core).toHaveBeenCalledWith(3, 4, false);
    expect(stats).toHaveBeenCalledWith(16, false);

    scene.dispose();
    expect(worker.posted.at(-1)).toEqual({ type: "dispose", id: 1 });
    worker.reply({ type: "core", id: 1, x: 5, y: 6, settled: true });
    expect(core).toHaveBeenCalledTimes(1);
  });

  test("a core reported before onCore is passed on with its settled flag when the page subscribes", async () => {
    const { worker, host } = harness();
    const pending = host.build(opts);
    worker.reply({ type: "ready", id: 1 });
    const scene = (await pending)!;
    worker.reply({ type: "core", id: 1, x: 10, y: 20, settled: false });
    const core = vi.fn();
    scene.onCore(core);
    expect(core).toHaveBeenCalledWith(10, 20, false);
  });

  test("hold reaches the worker once per change, ahead of the progress that starts the drawing", async () => {
    const { worker, host } = harness();
    const pending = host.build(opts);
    worker.reply({ type: "ready", id: 1 });
    const scene = (await pending)!;
    scene.hold(true);
    scene.hold(true);
    scene.setProgress(4.2);
    scene.hold(false);
    scene.hold(false);
    expect(worker.types().slice(1)).toEqual(["hold", "progress", "hold"]);
    expect(worker.posted.filter((m) => m.type === "hold")).toEqual([
      { type: "hold", on: true },
      { type: "hold", on: false },
    ]);
    scene.dispose();
    scene.hold(true);
    expect(worker.posted.at(-1)).toEqual({ type: "dispose", id: 1 });
  });

  test("an orphaned ready (nobody waits for that build any more) is disposed at once", () => {
    const { worker } = harness();
    worker.reply({ type: "ready", id: 42 });
    expect(worker.posted).toEqual([{ type: "dispose", id: 42 }]);
  });

  test("a build that failed in the worker rejects; a ready for it later is an orphan", async () => {
    const { worker, host } = harness();
    const pending = host.build(opts);
    worker.reply({ type: "error", id: 1, message: "context lost" });
    await expect(pending).rejects.toThrow("context lost");
    worker.reply({ type: "ready", id: 1 });
    expect(worker.posted.at(-1)).toEqual({ type: "dispose", id: 1 });
  });

  test("close() before ready: the build resolves null, the worker stops, and nothing it sends later is taken", async () => {
    vi.useFakeTimers();
    try {
      const { worker, host } = harness();
      const pending = host.build(opts);
      host.close();
      expect(await pending).toBeNull();
      // Asked to close (it clears the canvas and ends itself), and stopped regardless a moment later.
      expect(worker.posted.at(-1)).toEqual({ type: "close" });
      expect(worker.terminated).toBe(false);
      vi.advanceTimersByTime(1000);
      expect(worker.terminated).toBe(true);
      const sent = worker.posted.length;
      worker.reply({ type: "ready", id: 1 });
      expect(worker.posted.length).toBe(sent);
      expect(await host.build(opts)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  test("close() with a scene up: the worker disposes it (clearing the canvas) before it ends", async () => {
    const { worker, host } = harness();
    const pending = host.build(opts);
    worker.reply({ type: "ready", id: 1 });
    await pending;
    host.close();
    expect(worker.posted.slice(-1)).toEqual([{ type: "close" }]);
    expect(worker.types()).not.toContain("dispose"); // close disposes in the worker; no separate message is needed
  });

  test("dispose after close posts nothing", async () => {
    const { worker, host } = harness();
    const pending = host.build(opts);
    worker.reply({ type: "ready", id: 1 });
    const scene = (await pending)!;
    host.close();
    const sent = worker.posted.length;
    scene.dispose();
    scene.setProgress(1);
    expect(worker.posted.length).toBe(sent);
  });

  test("unavailable (only software WebGL on the canvas) resolves null and closes the worker", async () => {
    const { worker, host } = harness();
    const pending = host.build(opts);
    worker.reply({ type: "unavailable", id: 1 });
    expect(await pending).toBeNull();
    expect(worker.posted.at(-1)).toEqual({ type: "close" });
    expect(await host.build(opts)).toBeNull();
  });

  test("the canvas fires the context's loss and restore, as when the main thread draws on it", () => {
    const { worker, canvas } = harness();
    const seen: string[] = [];
    canvas.addEventListener("webglcontextlost", (e) => seen.push(`${e.type}:${e.cancelable}`));
    canvas.addEventListener("webglcontextrestored", (e) => seen.push(e.type));
    worker.reply({ type: "lost" });
    worker.reply({ type: "restored" });
    expect(seen).toEqual(["webglcontextlost:true", "webglcontextrestored"]);
  });

  test("the clip sent to the worker is the part the page's last 3 windows share: its frames can be ahead of the DOM's", async () => {
    const { worker, host } = harness();
    const pending = host.build(opts);
    worker.reply({ type: "ready", id: 1 });
    const scene = (await pending)!;
    const sent = () => worker.posted.filter((m) => m.type === "clip").map((m) => (m as { clip: { r: number } | null }).clip);
    // The hole grows: the worker keeps to the smallest of the recent windows.
    for (const r of [100, 150, 200, 250]) scene.setClip({ x: 700, y: 400, r });
    expect(sent().map((c) => c?.r)).toEqual([100, 150]);
    // The window opens to the whole viewport (null): the worker still clips until the page has shown it open 3 times.
    scene.setClip(null);
    scene.setClip(null);
    scene.setClip(null);
    expect(sent().map((c) => c?.r ?? null)).toEqual([100, 150, 200, 250, null]);
    // A centre that moves shrinks the shared part by the move, so it stays inside every recent window.
    for (const x of [700, 710, 720]) scene.setClip({ x, y: 400, r: 300 });
    expect(sent().at(-1)).toEqual({ x: 720, y: 400, r: 280 });
  });

  test("an unchanged scroll position or clip is not posted again", async () => {
    const { worker, host } = harness();
    const pending = host.build(opts);
    worker.reply({ type: "ready", id: 1 });
    const scene = (await pending)!;
    scene.setProgress(1);
    scene.setProgress(1);
    scene.setClip({ x: 1, y: 2, r: 3 });
    scene.setClip({ x: 1, y: 2, r: 3 });
    for (let i = 0; i < 5; i++) scene.setClip(null); // null applies once the last 3 windows all were
    await settle();
    expect(worker.types().filter((t) => t === "progress" || t === "clip")).toEqual(["progress", "clip", "clip"]);
  });
});
