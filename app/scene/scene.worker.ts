/**
 * The 3D scene's worker: it draws the scene on the canvas the page transferred to it, so the hardware check, three.js,
 * the build, the card textures' fetches and decodes and every frame stay off the main thread (Ruling R23).
 * `mount.ts` is its host. This entry is small and imports no three.js: the scene chunk loads only once the check
 * has found a capable context.
 *
 * Messages (one scene at a time; `id` numbers the builds, so the host can tell a reply about a stale one):
 *   page → worker
 *     hello     { allowSoftwareGL }       first: what can the worker do? (answered by caps)
 *     init      { id, options, canvas? }  build a scene; the canvas comes with the first init only (transferred)
 *     progress  { P }                     SceneHandle.setProgress
 *     pointer   { x, y }                  SceneHandle.setPointer
 *     resize    { width, height, dpr }    SceneHandle.resize
 *     tier      { tier }                  SceneHandle.setTier
 *     clip      { clip }                  SceneHandle.setClip (the black hole, since Task 6P)
 *     dispose   { id }                    SceneHandle.dispose of that build's scene
 *     close                               no scene again: dispose (which clears the canvas), then end the worker
 *   worker → page
 *     caps      { fonts, webgl }          the answer to hello: can it load the monogram's face; does it get a WebGL 2
 *                                         context here (tried on a throwaway canvas, before the page's is transferred)
 *     ready     { id }                    the build is up (it draws after its first progress)
 *     unavailable { id }                  no capable WebGL 2 on the canvas (only in software): tier 2
 *     error     { id, message }           the build failed (a context lost while building among the causes)
 *     core      { id, x, y }              SceneHandle.onCore
 *     stats     { id, avgFrameMs, steady } SceneHandle.onStats
 *     lost, restored                      the canvas's context was lost or restored (Rulings R19 and R22)
 * There is no `focus` message: the HUD reads focusIndexAt (Ruling R3).
 */
import { isSoftwareRenderer, sceneContextAttributes } from "./context";
import { MONOGRAM_FONT_FACE, type Circle, type SceneHandle, type SceneOptions, type Tier } from "./types";

export type ToWorker =
  | { type: "hello"; allowSoftwareGL: boolean }
  | { type: "init"; id: number; options: SceneOptions; canvas?: OffscreenCanvas }
  | { type: "progress"; P: number }
  | { type: "pointer"; x: number; y: number }
  | { type: "resize"; width: number; height: number; dpr: number }
  | { type: "tier"; tier: Tier }
  | { type: "clip"; clip: Circle | null }
  | { type: "hold"; on: boolean }
  | { type: "dispose"; id: number }
  | { type: "close" };

export type FromWorker =
  | { type: "caps"; fonts: boolean; webgl: boolean }
  | { type: "ready"; id: number }
  | { type: "unavailable"; id: number }
  | { type: "error"; id: number; message: string }
  | { type: "core"; id: number; x: number; y: number; settled: boolean }
  | { type: "stats"; id: number; avgFrameMs: number; steady: boolean }
  | { type: "lost" }
  | { type: "restored" };

type InitMessage = Extract<ToWorker, { type: "init" }>;

/** The parts of a dedicated worker's global scope used here (the project's TypeScript types the DOM, not workers). */
const scope = self as unknown as {
  postMessage(message: FromWorker): void;
  addEventListener(type: "message", listener: (e: MessageEvent<ToWorker>) => void): void;
  close(): void;
  fonts?: FontFaceSet;
};
const post = (message: FromWorker) => scope.postMessage(message);

/** FontFace plus the worker's own font set; without them the host rasterises the monogram (SceneOptions.glyphs). */
const fonts = typeof FontFace === "function" && !!scope.fonts;

/**
 * Whether a WebGL 2 context with the scene's attributes can be had here, and a frame clock to draw with. Tried on a
 * throwaway canvas and released at once, before the page transfers its own: where it fails, the page keeps its
 * canvas and the main thread renders (or shows the poster), and this check costs the main thread nothing.
 */
function webglHere(allowSoftwareGL: boolean): boolean {
  if (typeof OffscreenCanvas !== "function" || typeof requestAnimationFrame !== "function") return false;
  const gl = new OffscreenCanvas(1, 1).getContext("webgl2", sceneContextAttributes(allowSoftwareGL)) as
    | WebGL2RenderingContext
    | null;
  if (!gl) return false;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

let canvas: OffscreenCanvas | null = null;
let scene: SceneHandle | null = null;
let sceneId = -1;
/** Builds run one after another: a rebuild after a restored context never overlaps the build it replaces. */
let building: Promise<void> = Promise.resolve();
let fontReady: Promise<void> | null = null;

/** Loads the monogram's face into the worker's font set, once. If it fails, a fallback face still draws the letters. */
function loadMonogramFace(): Promise<void> {
  fontReady ??= (async () => {
    const face = new FontFace(MONOGRAM_FONT_FACE.family, `url(${MONOGRAM_FONT_FACE.url})`, {
      weight: MONOGRAM_FONT_FACE.weight,
    });
    scope.fonts!.add(face);
    await face.load();
  })().catch(() => undefined);
  return fontReady;
}

/** Context loss and restore happen to the canvas, whichever scene is on it; the host decides what follows. */
function watchContext(c: OffscreenCanvas): void {
  c.addEventListener("webglcontextlost", (e) => {
    e.preventDefault(); // allows the restore
    post({ type: "lost" });
  });
  c.addEventListener("webglcontextrestored", () => post({ type: "restored" }));
}

function disposeScene(): void {
  scene?.dispose();
  scene = null;
  sceneId = -1;
}

async function build({ id, options, canvas: transferred }: InitMessage): Promise<void> {
  if (transferred) {
    canvas = transferred;
    watchContext(canvas);
  }
  if (!canvas) throw new Error("The scene worker has no canvas");
  // A new build replaces the scene on the canvas (the host only rebuilds once the old one is stale).
  disposeScene();
  // The hardware check runs on the canvas itself: its context is the one the scene then draws with, so the GPU
  // is set up once (failIfMajorPerformanceCaveat plus the renderer's name, Ruling R18).
  const gl = canvas.getContext("webgl2", sceneContextAttributes(options.allowSoftwareGL)) as WebGL2RenderingContext | null;
  if (!gl || (!options.allowSoftwareGL && isSoftwareRenderer(gl))) {
    post({ type: "unavailable", id });
    return;
  }
  if (!options.glyphs && fonts) await loadMonogramFace();
  const { createScene } = await import("./scene");
  const built = await createScene(canvas, options);
  scene = built;
  sceneId = id;
  built.onCore((x, y, settled) => post({ type: "core", id, x, y, settled }));
  built.onStats((avgFrameMs, steady) => post({ type: "stats", id, avgFrameMs, steady }));
  post({ type: "ready", id });
}

scope.addEventListener("message", ({ data: m }) => {
  switch (m.type) {
    case "hello":
      post({ type: "caps", fonts, webgl: webglHere(m.allowSoftwareGL) });
      break;
    case "init":
      building = building.then(() =>
        build(m).catch((err: unknown) => post({ type: "error", id: m.id, message: String((err as Error)?.message ?? err) })),
      );
      break;
    case "progress":
      scene?.setProgress(m.P);
      break;
    case "pointer":
      scene?.setPointer(m.x, m.y);
      break;
    case "resize":
      scene?.resize(m.width, m.height, m.dpr);
      break;
    case "tier":
      scene?.setTier(m.tier);
      break;
    case "clip":
      scene?.setClip(m.clip);
      break;
    case "hold":
      scene?.hold(m.on);
      break;
    case "dispose":
      if (m.id === sceneId) disposeScene();
      break;
    case "close":
      disposeScene();
      // The cleared canvas reaches the page with the next frame; then the worker ends (the host also stops it soon).
      requestAnimationFrame(() => scope.close());
      break;
  }
});
