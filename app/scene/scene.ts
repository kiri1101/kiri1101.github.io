/**
 * The Orbit 3D scene: the morphing orb with its frost aura, the collapse into the galaxy core, the star
 * field and the project cards. Ported from the approved prototype's WebGL code; while the black hole opens,
 * the scene clips itself to the hole (the prototype masked the canvas with CSS, which was too slow).
 *
 * It touches no DOM (no document, window or Image), so it runs unchanged in a worker on an OffscreenCanvas
 * (scene.worker.ts) or on the main thread (mount.ts). It owns its requestAnimationFrame loop; the host feeds it
 * the smoothed scroll position through `setProgress` and never asks it to smooth again.
 */
import { PerspectiveCamera, SRGBColorSpace, Scene, Vector3, WebGLRenderer } from "three";
import { ORB_STILL_UNTIL, phasesAt, trackLength } from "~/lib/timeline";
import { cardsOnScreen, createCards } from "./cards";
import { createClip } from "./clip";
import { isSoftwareRenderer, sceneContextAttributes } from "./context";
import { createFrost } from "./frost";
import { createGalaxy } from "./galaxy";
import { monogramPoints, ringPoints, shufflePoints, spherePoints } from "./geometry";
import { ORB_R, createOrb, orbPointCount } from "./orb";
import { RENDER_SCALE } from "./quality";
import { rampStep } from "./ramp";
import type { SceneHandle, SceneOptions } from "./types";

/** Camera poses: the studio hero and the galaxy, per layout. */
const POSES = {
  wide: {
    hero: new Vector3(0, 0, 9.4),
    heroTarget: new Vector3(0, -0.6, 0),
    galaxy: new Vector3(0, 4.2, 13.8),
    galaxyTarget: new Vector3(1.4, -1.1, 2.2),
  },
  small: {
    hero: new Vector3(0, 0, 13.5),
    heroTarget: new Vector3(0, -1.4, 0),
    galaxy: new Vector3(0, 5.6, 16.5),
    galaxyTarget: new Vector3(0, -1.0, 2.4),
  },
};

/** Frame intervals longer than this are pauses (a hidden tab, a debugger), not slow frames. */
const MAX_SAMPLE_MS = 250;
const STATS_WINDOW = 60;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Yields to the event loop, so building the scene is a run of short tasks instead of one long one. */
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Card textures are fetched when the browser is next idle after the scene goes live, at the latest after this. */
const CARDS_IDLE_TIMEOUT_MS = 2000;

/** How long a scene that starts in the galaxy waits for its on-screen cards' textures before drawing without them. */
const PRIME_TIMEOUT_MS = 1500;

/** Runs `cb` when the browser is idle; a worker (or Safari) has no idle callbacks, so it waits a moment instead. */
function whenIdle(cb: () => void, timeout: number): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(cb, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(cb, 250);
  return () => clearTimeout(id);
}

const CONTEXT_LOST = "The WebGL context was lost while the scene was being built";

/**
 * `work`, unless the context is lost first: then it rejects at once. On a lost context compileAsync would wait
 * for ever for programs that never link; releasing the build (createScene's catch) ends that wait.
 */
function unlessLost<T>(canvas: HTMLCanvasElement | OffscreenCanvas, work: Promise<T>): Promise<T> {
  const target = canvas as EventTarget;
  return new Promise<T>((resolve, reject) => {
    const onLost = () => reject(new Error(CONTEXT_LOST));
    target.addEventListener("webglcontextlost", onLost);
    work.then(resolve, reject).finally(() => target.removeEventListener("webglcontextlost", onLost));
  });
}

type Disposable = { dispose(): void };

export async function createScene(canvas: HTMLCanvasElement | OffscreenCanvas, opts: SceneOptions): Promise<SceneHandle> {
  if (typeof OffscreenCanvas === "undefined") throw new Error("The 3D scene needs OffscreenCanvas");
  // Creating the context here (not inside three.js) lets an unavailable or software-only WebGL 2 fail quietly:
  // the host keeps the poster.
  const attributes = sceneContextAttributes(opts.allowSoftwareGL);
  const gl = (canvas as OffscreenCanvas).getContext("webgl2", attributes) as WebGL2RenderingContext | null;
  if (!gl || (!opts.allowSoftwareGL && isSoftwareRenderer(gl))) throw new Error("WebGL 2 is unavailable, or only in software");

  // Everything built so far, released in reverse order by dispose(), or at once if a later stage throws.
  const built: Disposable[] = [];
  const release = () => {
    for (const part of built.splice(0).reverse()) {
      try {
        part.dispose();
      } catch {
        // keep releasing the rest
      }
    }
  };
  try {
    return await build(canvas, gl, opts, built, release);
  } catch (err) {
    release();
    throw err;
  }
}

async function build(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  gl: WebGL2RenderingContext,
  opts: SceneOptions,
  built: Disposable[],
  release: () => void,
): Promise<SceneHandle> {
  const { small } = opts;
  let { width, height, dpr, tier } = opts;
  const pixelRatio = () => Math.min(dpr || 1, 2) * RENDER_SCALE[tier];
  const pr = pixelRatio();

  // ---------- stages, each its own task ----------
  /** Ends a stage. A context lost meanwhile ends the build: nothing built on it would ever draw (Ruling R22). */
  const nextStage = async () => {
    await nextTask();
    if (gl.isContextLost()) throw new Error(CONTEXT_LOST);
  };

  const renderer = new WebGLRenderer({ canvas, context: gl, antialias: false, alpha: true, powerPreference: "high-performance" });
  built.push(renderer);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  await nextStage();

  const galaxy = createGalaxy({ small, pr });
  built.push(galaxy);
  await nextStage();

  const n = orbPointCount(small);
  const sph = shufflePoints(spherePoints(n, ORB_R));
  await nextStage();
  const mono = monogramPoints(n, opts.monogram, opts.glyphs);
  await nextStage();
  const ring = ringPoints(n);
  await nextStage();

  const frost = createFrost({ sph, mono, ring, small, pr, surface: ORB_R * 0.9 });
  built.push(frost);
  const orb = createOrb({ shapes: { sph, mono, ring }, frost, small, pr });
  built.push(orb);
  await nextStage();

  const cards = createCards(opts.cards, { small, anisotropy: renderer.capabilities.getMaxAnisotropy() });
  built.push(cards);
  const clip = createClip();
  built.push(clip);
  await nextStage();

  const scene = new Scene();
  scene.add(galaxy.stars, galaxy.core, orb.object, ...cards.meshes, clip.mesh);
  const camera = new PerspectiveCamera(40, width / height, 0.1, 200);

  const applyQuality = () => {
    const p = pixelRatio();
    renderer.setPixelRatio(p);
    renderer.setSize(width, height, false); // CSS sizes the canvas; this sets the drawing buffer
    orb.setPixelRatio(p);
    galaxy.setPixelRatio(p);
    orb.setTier(tier);
    galaxy.setTier(tier);
  };
  applyQuality();

  // ---------- camera path ----------
  const pose = small ? POSES.small : POSES.wide;
  const target = new Vector3();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let P = 0;
  let ph = phasesAt(0);

  const placeCamera = () => {
    const k = ph.camera; // studio pose → galaxy pose; the flight starts once the black hole has opened
    camera.position.lerpVectors(pose.hero, pose.galaxy, k);
    camera.position.x += pointer.x * lerp(0.35, 0.8, k);
    camera.position.y -= pointer.y * lerp(0.25, 0.5, k);
    target.lerpVectors(pose.heroTarget, pose.galaxyTarget, k);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  };

  // ---------- the core's screen position, for the DOM layers centred on it ----------
  const core = new Vector3();
  let coreCb: ((x: number, y: number, settled: boolean) => void) | null = null;
  let coreX = NaN;
  let coreY = NaN;
  let coreSent: boolean | null = null;
  /** Tells the host where the core is, and whether the scene is fully up; repeats nothing it has already said. */
  const reportCore = () => {
    if (!coreCb) return;
    core.set(0, 0, 0).project(camera);
    const x = (core.x * 0.5 + 0.5) * width;
    const y = (-core.y * 0.5 + 0.5) * height;
    const settled = coreSettled();
    if (Math.abs(x - coreX) < 0.01 && Math.abs(y - coreY) < 0.01 && settled === coreSent) return;
    coreX = x;
    coreY = y;
    coreSent = settled;
    coreCb(x, y, settled);
  };

  placeCamera();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  // Compile every program now, in parallel where the driver allows, so the first frame does not stall.
  await unlessLost(canvas, renderer.compileAsync(scene, camera));
  if (gl.isContextLost()) throw new Error(CONTEXT_LOST);

  // ---------- loop ----------
  /** The closing sections are opaque and cover the canvas once the page scrolls past the track. */
  const coveredFrom = trackLength(opts.cards.length);
  let statsCb: ((avgFrameMs: number, steady: boolean) => void) | null = null;
  let statSum = 0;
  let statCount = 0;
  /** The frame before uploaded a card texture: one-off work, so the interval after it is not a steady-state sample. */
  let uploaded = false;
  /** The current window has left an interval out (an upload frame or a pause), so it is not all steady-state. */
  let leftOut = false;
  let started = false; // nothing is drawn before the host's first setProgress, so no frame shows the wrong P
  /** The host holds the first frame back while a page transition runs (Ruling R35); see SceneHandle.hold. */
  let held = false;
  /** A fade-in's core has been reported, a frame ahead of the first frame presented. */
  let announced = false;
  let drawn = false;
  let disposed = false;
  let last = -1;
  let time = 0;
  let raf = 0;
  /** Cancels the idle wait for the card textures; set once the first frame is drawn. */
  let cancelCards: (() => void) | null = null;

  // ---------- the first frame: where the scene starts decides how it appears ----------
  let firstChecked = false;
  /** The on-screen cards' textures are on their way; the first frame waits for them until `primeUntil`. */
  let priming = false;
  let primeUntil = 0;
  /** The fade-in still to run (armed before the first frame) or running; null at the hero and once it is done. */
  let ramp: { start: number; fade: number } | null = null;
  /** Whether the scene is fully up: not while it fades in (the host keeps the poster till then). */
  const coreSettled = () => ramp === null;

  /** Before the first frame: a fade-in past the hero, and in the galaxy the visible cards' textures first. */
  const checkFirstFrame = (now: number) => {
    firstChecked = true;
    if (P >= ORB_STILL_UNTIL) ramp = { start: -1, fade: 0 };
    const onScreen = ph.gIn > 0 ? cardsOnScreen(ph.cardOffset, opts.cards.length) : [];
    if (onScreen.length === 0) return;
    priming = true;
    primeUntil = now + PRIME_TIMEOUT_MS;
    void cards.prime(onScreen).finally(() => {
      priming = false;
    });
  };

  /** The frame's fade: 1 except while the fade-in runs. */
  const fadeFor = (now: number): number => {
    if (!ramp) return 1;
    if (ramp.start < 0) ramp.start = now;
    const f = (ramp.fade = rampStep(ramp.fade, now - ramp.start));
    if (f >= 1) ramp = null;
    return f;
  };

  const frame = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (!started) return;
    let primedUpload = false;
    if (!drawn) {
      if (!firstChecked) checkFirstFrame(now);
      if (held) return; // ready (fade-in armed, the visible cards' textures on their way), but nothing is presented yet
      if (priming && now < primeUntil) return; // the first frame shows the cards it has on screen
      if (ramp && !announced) {
        // A fade-in: the host's layers (the black hole's window above all) move onto the core a frame before the
        // first frame is presented, so they are on it from that frame on. The poster stays (not settled yet).
        announced = true;
        placeCamera();
        reportCore();
        return;
      }
      primedUpload = cards.uploadPrimed(renderer);
    }
    const interval = last < 0 ? 0 : now - last;
    last = now;
    const dt = Math.min(0.05, interval / 1000);
    time += dt;
    if (interval > 0 && interval <= MAX_SAMPLE_MS && !uploaded) {
      statSum += interval;
      if (++statCount === STATS_WINDOW) {
        const report = [statSum / STATS_WINDOW, !leftOut] as const;
        statSum = 0;
        statCount = 0;
        leftOut = false;
        statsCb?.(...report);
        // The host may dispose the scene from that callback (tier 2): then this frame must draw nothing more.
        if (disposed) return;
      }
    } else if (interval > 0) {
      leftOut = true;
    }

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    orb.update(ph, P, dt, time, pointer);
    placeCamera();
    const sway = galaxy.update(ph, P, time);
    uploaded = cards.uploadNext(renderer) || primedUpload; // at most one card texture per frame, after the first
    cards.update(ph.cardOffset, ph.gIn, sway, camera);
    clip.setFade(fadeFor(now));
    clip.update(renderer, width, height);
    if (P < coveredFrom) renderer.render(scene, camera);
    drawn = true;
    // Every frame, fade-in included: the host's layers centre on the core this frame shows.
    reportCore();
    if (!coreSettled()) return; // fading in: the rest waits until the scene is fully up
    // Live now: the card textures, which nothing shows until the galaxy, load when the browser is next idle. Not
    // during a fade-in: their uploads would cost it frames, so they start once it is done.
    cancelCards ??= whenIdle(() => cards.load(), CARDS_IDLE_TIMEOUT_MS);
  };
  raf = requestAnimationFrame(frame);

  return {
    setProgress(p) {
      P = p;
      ph = phasesAt(p);
      started = true;
      if (!drawn) return;
      // Report the core for this P right away, so the host's DOM layers match the frame drawn next.
      placeCamera();
      reportCore();
    },
    setPointer(x, y) {
      pointer.tx = x;
      pointer.ty = y;
    },
    resize(w, h, d) {
      if (w === width && h === height && d === dpr) return; // a phone's address bar fires resize without one
      width = w;
      height = h;
      dpr = d;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      applyQuality();
      if (drawn) reportCore();
    },
    setTier(t) {
      // Tier 2 means no WebGL at all; the host disposes the scene and shows the poster. Until then, draw as tier 1.
      if (t === tier) return;
      tier = t;
      applyQuality();
      // Each stats window covers one tier only.
      statSum = 0;
      statCount = 0;
      leftOut = false;
    },
    setClip(c) {
      clip.set(c);
    },
    onCore(cb) {
      coreCb = cb;
      coreX = coreY = NaN;
      coreSent = null;
      if (drawn) reportCore();
    },
    hold(on) {
      held = on;
    },
    onStats(cb) {
      statsCb = cb;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      cancelCards?.();
      coreCb = statsCb = null;
      // Present an empty frame, so no frozen orb sits over the poster that comes back.
      renderer.setRenderTarget(null);
      renderer.clear();
      release();
    },
  };
}
