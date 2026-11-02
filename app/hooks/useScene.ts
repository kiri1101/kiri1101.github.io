import { useEffect, useRef, useState, type RefObject } from "react";
import { whenIdle } from "~/lib/idle";
import type { SceneCore } from "~/lib/phase-dom";
import { scrollUnit } from "~/lib/scroll-unit";
import { ORB_STILL_UNTIL } from "~/lib/timeline";
import { sceneLifecycle } from "~/scene/lifecycle";
import { canvasSize, mountScene, releaseCanvas, rendersInWorker, unmountScene } from "~/scene/mount";
import { adaptiveQuality, frameMeter, pickTier, type QualityEnv } from "~/scene/quality";
import type { CardInput, SceneHandle, Tier } from "~/scene/types";
import { monogramOf, site } from "~/site.config";

declare global {
  interface Window {
    /**
     * Test-only switch, set before any page script by Playwright's `addInitScript`; never set in production.
     * "off" keeps the scene out of tests about the DOM layers. "allow-software-gl" lets the scene run on software
     * WebGL, the only kind headless Chromium has (scene tests, `npm run poster`); a worker cannot see it, so the
     * page passes it on with the build (SceneOptions.allowSoftwareGL).
     */
    __orbitSceneTest?: "off" | "allow-software-gl";
    /**
     * Test-only, like the switch above: stands in for real frame timing in the adaptive-quality governor, so a test of
     * its rules does not depend on how busy the machine is. Every stats window reports `frameMs` as the scene's frame
     * interval, and the governor's clock advances 4 s per window (so its 2 s hold between changes always has passed).
     */
    __orbitFrames?: { frameMs: number };
  }
}

/** The prototype's phone layout breakpoint; the scene reads it once, at start. */
const SMALL_QUERY = "(max-width: 760px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** three.js waits for an idle moment, at the latest this long after the page has hydrated. */
const IDLE_TIMEOUT_MS = 1500;

/** The visitor's settings that rule the scene out before anything is downloaded. */
function environment(): Omit<QualityEnv, "webgl"> {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return { reducedMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches, saveData: connection?.saveData === true };
}

export type SceneState = {
  /** The live scene, for the scroll loop to feed `setProgress`; null while the poster stands in. */
  scene: RefObject<SceneHandle | null>;
  /**
   * True once the page knows the scene is not drawing: tier 2 (reduced motion, save-data, no capable WebGL), a
   * failed build or a lost context. The gallery then shows the list view. False while the scene loads or is live.
   */
  still: boolean;
};

/**
 * Starts the 3D scene on `#scene` once the page is idle (from a worker where the browser allows, see mount.ts) and
 * wires it to the page: pointer, the canvas's size, adaptive quality, and the orb core's screen position into
 * `centre` (which hides the poster once the scene has settled). `#scene[data-scene]` says which way it went:
 * "ramp" while a scene that starts past the hero fades in, "live" once it is fully up, "off" while the poster stands
 * in. `#scene[data-tier]` is the quality tier (quality.ts).
 *
 * While `hold` is true (a page transition is cross-fading to this page) the scene is built and its first frame made
 * ready, but nothing is presented until the transition has finished, so it never blends over a canvas that is
 * drawing (Ruling R35). When the page goes, the scene is disposed and its worker closed.
 */
export function useScene(cards: CardInput[], centre: RefObject<SceneCore | null>, hold = false): SceneState {
  const handle = useRef<SceneHandle | null>(null);
  const cardsRef = useRef(cards);
  const holdRef = useRef(hold);
  holdRef.current = hold;
  const [still, setStill] = useState(false);

  useEffect(() => {
    const canvas = document.getElementById("scene");
    if (!(canvas instanceof HTMLCanvasElement)) return;
    let state: "ramp" | "live" | "off" | undefined;
    const mark = (next: "ramp" | "live" | "off") => {
      if (state === next) return;
      state = next;
      canvas.dataset.scene = next;
    };
    const showTier = (tier: Tier) => {
      canvas.dataset.tier = String(tier);
    };
    const testSwitch = window.__orbitSceneTest;
    if (testSwitch === "off") {
      mark("off");
      return;
    }
    const allowSoftwareGL = testSwitch === "allow-software-gl";
    const env = environment();
    const startTier = pickTier({ ...env, webgl: true });
    showTier(startTier);
    if (startTier === 2) {
      // Reduced motion or save-data: the poster and the list view; three.js is never downloaded.
      mark("off");
      setStill(true);
      return;
    }
    const injected = window.__orbitFrames;
    let injectedClock = 0;
    const quality = adaptiveQuality(startTier, injected ? () => injectedClock : undefined);
    // The page's own frames while a scene drawn from a worker is up: the scene can run faster than the DOM layers it
    // shares the GPU with, and the visitor sees both. (On the main thread the scene's frames are the page's.)
    const pageFrames = frameMeter();
    let pageRaf = 0;
    let lastFrame = -1;
    const samplePage = (now: number) => {
      if (lastFrame >= 0) pageFrames.add(now - lastFrame);
      lastFrame = now;
      pageRaf = requestAnimationFrame(samplePage);
    };
    const stopSampling = () => {
      cancelAnimationFrame(pageRaf);
      pageRaf = 0;
      lastFrame = -1;
    };
    /** Still in the hero, where the poster is the orb's own picture (Ruling R29). */
    const inHero = () => window.scrollY / scrollUnit() < ORB_STILL_UNTIL;

    const life = sceneLifecycle<SceneHandle>({
      async build(isCurrent) {
        const scene = await mountScene(canvas, {
          tier: quality.tier,
          small: window.matchMedia(SMALL_QUERY).matches,
          monogram: monogramOf(site.owner.name),
          cards: cardsRef.current,
          allowSoftwareGL,
        });
        if (!scene && isCurrent()) {
          // No capable WebGL (none, or only in software): tier 2.
          showTier(pickTier({ ...env, webgl: false }));
          mark("off");
          setStill(true);
        }
        return scene;
      },
      live(scene) {
        // Built while a transition still runs: its first frame waits for the end (the hold effect below).
        scene.hold(holdRef.current);
        handle.current = scene;
        // The canvas may have changed size while the scene was built.
        const s = canvasSize(canvas);
        scene.resize(s.width, s.height, s.dpr);
        quality.restart();
        const worker = rendersInWorker(scene);
        pageFrames.take();
        if (worker && !pageRaf) pageRaf = requestAnimationFrame(samplePage);
        scene.onStats((measuredMs, steady) => {
          if (injected) injectedClock += 4000;
          const avgFrameMs = injected?.frameMs ?? measuredMs;
          const pageMs = injected ? null : pageFrames.take();
          const next = quality.report({ sceneMs: avgFrameMs, steady, pageMs: worker ? pageMs : null, inHero: inHero() });
          if (next === null) return;
          if (next === 2) {
            stillForGood();
            return;
          }
          scene.setTier(next);
          showTier(next);
        });
        scene.onCore((x, y, settled) => {
          centre.current = { x, y, settled };
          if (!settled) mark("ramp");
          else if (state !== "live") {
            mark("live");
            setStill(false);
          }
        });
      },
      // Back to the poster: the DOM layers centre on it again (the scene has cleared the canvas), and the gallery
      // shows the list.
      off() {
        handle.current = null;
        centre.current = null;
        stopSampling();
        mark("off");
        setStill(true);
      },
      // A failed chunk load or scene build, a lost context among the causes: the poster stays, which is the
      // designed fallback. A stale build is no news: the page has left (its context lost on purpose), or a loss
      // meanwhile has brought the poster back already.
      failed(err, stale) {
        if (stale) return;
        console.warn("Orbit: the 3D scene is unavailable; showing the still image.", err);
      },
    });

    /**
     * Too slow even at tier 1 during start-up, in the hero (Ruling R29): tier 2 from now on, as if chosen at the start.
     * No scene is built again on this page (not even after a restored context), and the worker is closed.
     */
    const stillForGood = () => {
      stopSampling();
      life.stop();
      unmountScene(canvas);
      // A main-thread scene's context goes now: its cleared last frame is not always presented (Linux WebKit keeps
      // showing the orb over the poster), and a lost context always shows an empty canvas.
      releaseCanvas(canvas);
      handle.current = null;
      centre.current = null;
      showTier(2);
      mark("off");
      setStill(true);
    };

    const resize = () => {
      const s = canvasSize(canvas);
      life.scene?.resize(s.width, s.height, s.dpr);
    };
    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);
    // A change of pixel ratio alone (browser zoom, a window moved to another screen) leaves the canvas's CSS box as it
    // is, so the observer stays quiet. A query for the current ratio fires once when it changes; it is then re-armed
    // for the new ratio.
    let dprQuery: MediaQueryList | undefined;
    const onDprChange = () => {
      resize();
      watchDpr();
    };
    const watchDpr = () => {
      dprQuery?.removeEventListener("change", onDprChange);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprQuery.addEventListener("change", onDprChange, { once: true });
    };
    watchDpr();
    const onPointer = (e: PointerEvent) =>
      life.scene?.setPointer(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
    window.addEventListener("pointermove", onPointer, { passive: true });
    // A lost GPU context (driver reset, too many contexts) shows the poster; the scene is built again once, when
    // the browser restores the context. preventDefault is what allows the restore on the main thread (a worker
    // allows it itself, and its host re-dispatches the events here).
    const onLost = (e: Event) => {
      e.preventDefault();
      life.lost();
    };
    const onRestored = () => void life.restored();
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    let stopped = false;
    const start = () => {
      if (!stopped) void life.start();
    };
    // A first load waits for an idle moment, so the page paints and hydrates first. Arriving through a page
    // transition, the page has rendered already and the cross-fade runs on the compositor: the build starts at once,
    // to overlap it, its first frame held until the end (R35).
    let cancelStart: () => void;
    if (holdRef.current) {
      const id = setTimeout(start, 0);
      cancelStart = () => clearTimeout(id);
    } else {
      cancelStart = whenIdle(start, IDLE_TIMEOUT_MS);
    }

    return () => {
      stopped = true;
      cancelStart();
      resizer.disconnect();
      dprQuery?.removeEventListener("change", onDprChange);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      stopSampling();
      life.stop();
      unmountScene(canvas);
      // The page is leaving: a main-thread scene's GPU context goes now, not at garbage collection, so a page that
      // comes back holds a single context (a worker's goes with the worker).
      releaseCanvas(canvas);
      handle.current = null;
      centre.current = null;
    };
  }, [centre]);

  // The transition is over: the scene built during it presents its first frame.
  useEffect(() => {
    handle.current?.hold(hold);
  }, [hold]);

  return { scene: handle, still };
}
