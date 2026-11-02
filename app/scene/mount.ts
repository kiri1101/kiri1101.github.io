/**
 * Puts the 3D scene on the page's canvas. Where the browser can transfer a canvas to a worker, the scene renders in
 * `scene.worker.ts`: the hardware check, three.js, the build, the card textures and every frame stay off the main
 * thread (Ruling R23), which only transfers the canvas and posts progress, pointer, size, tier and clip. Elsewhere,
 * or if the worker cannot start or gets no WebGL 2 context, it renders on the main thread (the fallback, Ruling R27).
 *
 * Either way the page sees a SceneHandle, and the canvas element fires `webglcontextlost` / `webglcontextrestored`:
 * natively on the main thread, re-dispatched from the worker's messages otherwise. No three.js is imported here.
 */
import { isSoftwareRenderer, sceneContextAttributes } from "./context";
import type { FromWorker, ToWorker } from "./scene.worker";
import { MONOGRAM_FONT, type Circle, type SceneHandle, type SceneOptions } from "./types";

export type MountOptions = Omit<SceneOptions, "width" | "height" | "dpr" | "glyphs">;

/** How long a starting worker may take to report what it can do before the main thread renders instead. */
const WORKER_START_TIMEOUT_MS = 10_000;
/** How long a closing worker has to clear the canvas and end itself before it is stopped. */
const CLOSE_GRACE_MS = 1000;
/**
 * A worker's frames reach the screen independently of the page's, measured up to two frames ahead of the DOM while
 * the black hole opens (task-7/seam). So the worker clips to the part of the page's last CLIP_FRAMES windows they all
 * share: while the hole grows the scene stays inside the window the page shows. The inset is at most two frames of
 * growth, under the horizon's inset glow (HORIZON_REACH, 119 px).
 */
const CLIP_FRAMES = 3;

/** The part of circle `b` that is also inside `a` (null: everywhere), as a circle on b's centre. */
function shared(a: Circle | null, b: Circle | null): Circle | null {
  if (!a) return b;
  if (!b) return a;
  const moved = Math.hypot(b.x - a.x, b.y - a.y);
  return { x: b.x, y: b.y, r: Math.max(0, Math.min(b.r, a.r - moved)) };
}

/** The canvas's client box (classic scrollbars take their width out of the content box) and pixel ratio. */
export function canvasSize(canvas: HTMLCanvasElement): { width: number; height: number; dpr: number } {
  return { width: canvas.clientWidth, height: canvas.clientHeight, dpr: window.devicePixelRatio || 1 };
}

/** The worker path's feature gate: a canvas can be handed to a worker. */
export function canRenderInWorker(): boolean {
  return typeof Worker === "function" && typeof HTMLCanvasElement.prototype.transferControlToOffscreen === "function";
}

export type WorkerHost = { build(opts: MountOptions): Promise<SceneHandle | null>; close(): void };

/** One worker per canvas, kept across rebuilds (a canvas can be transferred only once). Null: render on the main thread. */
const hosts = new WeakMap<HTMLCanvasElement, Promise<WorkerHost | null>>();
/** Canvases whose control went to a worker that has since been closed: nothing can draw on them again. */
const spent = new WeakSet<HTMLCanvasElement>();
/** Handles on scenes that render in a worker. */
const inWorker = new WeakSet<SceneHandle>();

/**
 * Builds the scene on `canvas` at its current client size: in a worker via `transferControlToOffscreen()` where
 * available, else on the main thread. Resolves null for tier 2 and when there is no capable WebGL (none, or only in
 * software); rejects when the scene cannot be built (a failed chunk load or a lost context among the causes).
 * Called again after a lost context is restored, it builds on the same worker.
 */
export async function mountScene(canvas: HTMLCanvasElement, opts: MountOptions): Promise<SceneHandle | null> {
  if (opts.tier === 2 || spent.has(canvas)) return null;
  let host = hosts.get(canvas);
  if (!host && canRenderInWorker()) {
    host = startWorker(canvas, opts.allowSoftwareGL ?? false);
    hosts.set(canvas, host);
  }
  const worker = await host;
  return worker ? worker.build(opts) : mountOnMainThread(canvas, opts);
}

/** Whether `scene` renders in a worker, so the page's own frames are separate from the scene's. */
export function rendersInWorker(scene: SceneHandle): boolean {
  return inWorker.has(scene);
}

/** No scene will be drawn on this canvas again (the page is leaving, or tier 2): stops its worker, if it has one. */
export function unmountScene(canvas: HTMLCanvasElement): void {
  const host = hosts.get(canvas);
  hosts.delete(canvas);
  void host?.then((h) => h?.close());
}

/** Canvases a scene has been built on from the main thread: they hold its WebGL context. */
const drawnHere = new WeakSet<HTMLCanvasElement>();
/** Canvases that have left the page (releaseCanvas): no scene may be built on them any more. */
const released = new WeakSet<HTMLCanvasElement>();

/** Loses the WebGL context a main-thread scene made on `canvas` (getContext returns that same context again). */
function loseContext(canvas: HTMLCanvasElement): void {
  drawnHere.delete(canvas);
  canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
}

/**
 * The canvas is leaving the page (after `unmountScene`): frees the WebGL context a main-thread scene left on it,
 * which would otherwise live until garbage collection, so a page that comes back holds a single context. A worker's
 * context ends with its worker; a canvas that never drew is left alone. A main-thread build still on its way finds
 * the canvas released and frees what it made (mountOnMainThread).
 */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  released.add(canvas);
  if (drawnHere.has(canvas)) loseContext(canvas);
}

/** Whether a scene built (or about to be built) on `canvas` would be on a page that has gone. */
const gone = (canvas: HTMLCanvasElement) => released.has(canvas) || !canvas.isConnected;

// ---------- main thread ----------

/**
 * Whether the browser can give the scene what it asks for: a 2D OffscreenCanvas and a WebGL 2 context with these
 * attributes (by default, not a software one). Checked on a throwaway canvas, before three.js is downloaded, so
 * devices that would fall back anyway never pay for the 3D chunk.
 */
function canDrawScene(allowSoftwareGL: boolean): boolean {
  if (typeof OffscreenCanvas === "undefined") return false;
  const gl = document.createElement("canvas").getContext("webgl2", sceneContextAttributes(allowSoftwareGL));
  if (!gl) return false;
  const usable = allowSoftwareGL || !isSoftwareRenderer(gl);
  gl.getExtension("WEBGL_lose_context")?.loseContext(); // release it now rather than at garbage collection
  return usable;
}

async function mountOnMainThread(canvas: HTMLCanvasElement, opts: MountOptions): Promise<SceneHandle | null> {
  if (!canDrawScene(opts.allowSoftwareGL ?? false)) return null;
  // The scene rasterises the monogram with this face; if it fails to load, a fallback face still draws the letters.
  await document.fonts.load(MONOGRAM_FONT).catch(() => undefined);
  const { createScene } = await import("./scene");
  // The page may have gone while three.js loaded: then no context is made at all.
  if (gone(canvas)) return null;
  drawnHere.add(canvas);
  const scene = await createScene(canvas, { ...opts, ...canvasSize(canvas) });
  // Or it went while the scene was built: dispose it and free its context, which nothing else would release now.
  if (gone(canvas)) {
    scene.dispose();
    loseContext(canvas);
    return null;
  }
  return scene;
}

/** The monogram's letters rasterised here, for a worker that cannot load fonts (Ruling R27). */
async function rasteriseGlyphs(text: string): Promise<ImageData> {
  await document.fonts.load(MONOGRAM_FONT).catch(() => undefined);
  const { monogramGlyphs } = await import("./geometry");
  return monogramGlyphs(text);
}

// ---------- worker ----------

/**
 * Starts the scene worker and asks what it can do. Resolves null, so the main thread renders (or shows the poster),
 * when the worker's script cannot load or run, or the worker gets no WebGL 2 context or has no frame clock; the canvas
 * is still the page's then, because it is transferred only with the first build.
 */
function startWorker(canvas: HTMLCanvasElement, allowSoftwareGL: boolean): Promise<WorkerHost | null> {
  let worker: Worker;
  try {
    worker = new Worker(new URL("./scene.worker.ts", import.meta.url), { type: "module", name: "orbit-scene" });
  } catch {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const settle = (host: WorkerHost | null) => {
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (!host) worker.terminate();
      resolve(host);
    };
    const onMessage = ({ data }: MessageEvent<FromWorker>) => {
      if (data.type !== "caps") return;
      settle(data.webgl ? workerHost(canvas, worker, data.fonts) : null);
    };
    const onError = (e: Event) => {
      e.preventDefault(); // handled: the main thread renders instead
      settle(null);
    };
    const timer = setTimeout(() => settle(null), WORKER_START_TIMEOUT_MS);
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ type: "hello", allowSoftwareGL } satisfies ToWorker);
  });
}

type Pending = { resolve(scene: SceneHandle | null): void; reject(err: Error): void };
type WorkerScene = SceneHandle & {
  core(x: number, y: number, settled: boolean): void;
  stats(avgFrameMs: number, steady: boolean): void;
};

/**
 * The page's side of a started worker: builds scenes in it and routes its replies by build id. Exported for its unit
 * tests (mount.test.ts), which drive it with a fake worker.
 * - A reply about a build nobody waits for any more (an orphaned `ready`) is answered with `dispose`.
 * - `unavailable` (only software WebGL on the canvas) closes the worker: no scene will be drawn on this canvas.
 */
export function workerHost(canvas: HTMLCanvasElement, worker: Worker, fonts: boolean): WorkerHost {
  let nextId = 0;
  let transferred = false;
  let closed = false;
  const pending = new Map<number, Pending>();
  const scenes = new Map<number, WorkerScene>();
  const send = (message: ToWorker, transfer: Transferable[] = []) => worker.postMessage(message, transfer);

  const settle = (id: number, how: (p: Pending) => void) => {
    const p = pending.get(id);
    pending.delete(id);
    if (p) how(p);
  };

  /**
   * No scene will be drawn on this canvas again. The worker disposes its scene, which leaves the canvas cleared (a
   * worker stopped at once would leave its last frame over the poster), and ends itself; it is stopped regardless
   * after CLOSE_GRACE_MS.
   */
  const close = () => {
    if (closed) return;
    closed = true;
    send({ type: "close" });
    setTimeout(() => worker.terminate(), CLOSE_GRACE_MS);
    if (transferred) spent.add(canvas);
    for (const id of [...pending.keys()]) settle(id, (p) => p.resolve(null));
    for (const scene of [...scenes.values()]) scene.dispose();
  };

  worker.addEventListener("message", ({ data: m }: MessageEvent<FromWorker>) => {
    if (closed) return;
    switch (m.type) {
      case "ready": {
        if (!pending.has(m.id)) {
          send({ type: "dispose", id: m.id });
          break;
        }
        const scene = workerScene(m.id);
        scenes.set(m.id, scene);
        settle(m.id, (p) => p.resolve(scene));
        break;
      }
      case "unavailable":
        settle(m.id, (p) => p.resolve(null));
        close();
        break;
      case "error":
        settle(m.id, (p) => p.reject(new Error(m.message)));
        break;
      case "core":
        scenes.get(m.id)?.core(m.x, m.y, m.settled);
        break;
      case "stats":
        scenes.get(m.id)?.stats(m.avgFrameMs, m.steady);
        break;
      // The page listens on the canvas, as it does when the main thread draws on it.
      case "lost":
        canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
        break;
      case "restored":
        canvas.dispatchEvent(new Event("webglcontextrestored"));
        break;
    }
  });
  // An error escaping the worker's code (its build errors arrive as messages) is left for the browser to report, as
  // it would be on the main thread; no build in flight can be trusted to finish.
  worker.addEventListener("error", (e) => {
    for (const id of [...pending.keys()]) settle(id, (p) => p.reject(new Error(`The scene worker failed: ${e.message}`)));
  });

  /** The page's handle on a scene in the worker. Repeated values are not posted again. */
  function workerScene(id: number): WorkerScene {
    let disposed = false;
    let coreCb: ((x: number, y: number, settled: boolean) => void) | null = null;
    let statsCb: ((avgFrameMs: number, steady: boolean) => void) | null = null;
    let lastCore: [number, number, boolean] | null = null;
    let lastP = NaN;
    let held = false;
    /** The page's last CLIP_FRAMES windows, oldest first, and the clip last sent. */
    const windows: (Circle | null)[] = [];
    let lastClip: Circle | null = null;
    const post = (message: ToWorker) => {
      if (!disposed && !closed) send(message);
    };
    const scene: WorkerScene = {
      setProgress(P) {
        if (P === lastP) return;
        lastP = P;
        post({ type: "progress", P });
      },
      setPointer(x, y) {
        post({ type: "pointer", x, y });
      },
      resize(width, height, dpr) {
        post({ type: "resize", width, height, dpr });
      },
      setTier(tier) {
        post({ type: "tier", tier });
      },
      setClip(window) {
        windows.push(window && { ...window });
        if (windows.length > CLIP_FRAMES) windows.shift();
        const clip = windows.reduce(shared);
        const same = clip === lastClip || (!!clip && !!lastClip && clip.x === lastClip.x && clip.y === lastClip.y && clip.r === lastClip.r);
        if (same) return;
        lastClip = clip;
        post({ type: "clip", clip });
      },
      onCore(cb) {
        coreCb = cb;
        if (lastCore) cb(...lastCore);
      },
      hold(on) {
        if (on === held) return;
        held = on;
        post({ type: "hold", on });
      },
      onStats(cb) {
        statsCb = cb;
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        coreCb = statsCb = null;
        scenes.delete(id);
        if (!closed) send({ type: "dispose", id });
      },
      core(x, y, settled) {
        lastCore = [x, y, settled];
        coreCb?.(x, y, settled);
      },
      stats(avgFrameMs, steady) {
        statsCb?.(avgFrameMs, steady);
      },
    };
    inWorker.add(scene);
    return scene;
  }

  return {
    async build(opts) {
      if (closed) return null;
      const id = ++nextId;
      const options: SceneOptions = { ...opts, ...canvasSize(canvas) };
      if (!fonts) options.glyphs = await rasteriseGlyphs(opts.monogram);
      if (closed) return null;
      const message: Extract<ToWorker, { type: "init" }> = { type: "init", id, options };
      const transfer: Transferable[] = options.glyphs ? [options.glyphs.data.buffer] : [];
      if (!transferred) {
        const offscreen = canvas.transferControlToOffscreen();
        transferred = true;
        message.canvas = offscreen;
        transfer.push(offscreen);
      }
      return new Promise<SceneHandle | null>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        send(message, transfer);
      });
    },
    close,
  };
}
