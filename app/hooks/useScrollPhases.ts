import { useEffect, useRef, type RefObject } from "react";
import { applyPhases, findLayers, posterCentre, stageSize, type Point, type SceneCore } from "~/lib/phase-dom";
import { scrollUnit } from "~/lib/scroll-unit";
import { cardsEnd, focusIndexAt, phasesAt, trackLength, type Phases } from "~/lib/timeline";
import type { Circle } from "~/scene/types";

declare global {
  interface Window {
    /**
     * Test-only switch, set before any page script by Playwright's `addInitScript` (tests/e2e/scroll-probe.ts); never
     * set in production. Read once, when the scroll loop starts: if true, the loop publishes `__orbitP`.
     */
    __orbitProbe?: boolean;
    /**
     * Test-only: the eased P of the scroll loop's last frame, which the layers follow (the scroll position leads it).
     * Written every frame only while `__orbitProbe` is on; for a visitor it stays undefined. Nothing in the app reads it.
     */
    __orbitP?: number;
  }
}

export type ScrollPhasesOptions = {
  /** Number of projects; sets where the cards end and which one is focused. */
  count: number;
  /** Called with the focused project index whenever it changes, once the HUD is on screen. */
  onFocus?: (index: number) => void;
  /**
   * Screen position the black hole, glow and floor are centred on. A 3D scene writes the orb's projected point here
   * from its first frame, fade-in included; while it is null the centre of the orb poster is used. Once it is
   * `settled` the scene draws the orb itself, so the poster is hidden.
   */
  centre?: RefObject<SceneCore | null>;
  /**
   * Called every frame, after the layers, with where a 3D scene may draw while the black hole opens (stars only
   * inside the hole), or null for everywhere. The scene clips itself; a CSS mask on its canvas was too slow.
   */
  onSceneClip?: (clip: Circle | null) => void;
};

/**
 * Smooths the scroll position (P, in scroll units) and drives the DOM layers each animation frame.
 * `onFrame` runs first on every frame, so a 3D scene can take the new P and publish `centre` before the layers use it.
 */
export function useScrollPhases(onFrame: (ph: Phases, P: number) => void, options: ScrollPhasesOptions): void {
  const latest = useRef({ onFrame, options });
  latest.current = { onFrame, options };

  useEffect(() => {
    const layers = findLayers();
    if (!layers) return;
    let unit = scrollUnit();
    let target = window.scrollY / unit;
    let P = target;
    let last = performance.now();
    let posterAt: Point = posterCentre(layers.poster);
    let stage = stageSize(layers.studio);
    let focused = -1;
    let raf = 0;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const probe = window.__orbitProbe === true;

    const onResize = () => {
      const next = scrollUnit();
      if (next !== unit) {
        // Keep the focused project: re-scroll to the same P in the new unit.
        unit = next;
        window.scrollTo({ top: target * unit, behavior: "instant" });
      }
      posterAt = posterCentre(layers.poster);
      stage = stageSize(layers.studio);
    };
    window.addEventListener("resize", onResize);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      target = window.scrollY / unit;
      P += (target - P) * (1 - Math.exp(-dt * 7));
      if (Math.abs(target - P) < 1e-4) P = target;
      if (probe) window.__orbitP = P;
      const { onFrame: cb, options: o } = latest.current;
      const ph = phasesAt(P);
      cb(ph, P);
      const view = { w: window.innerWidth, h: window.innerHeight };
      const sceneCentre = o.centre?.current ?? null;
      const bh = applyPhases(
        layers,
        ph,
        P,
        sceneCentre ?? posterAt,
        view,
        stage,
        cardsEnd(o.count),
        now / 1000,
        sceneCentre?.settled === true,
        target >= trackLength(o.count),
        calm.matches,
      );
      o.onSceneClip?.(bh.sceneClip);
      if (ph.hudIn > 0.01) {
        const index = focusIndexAt(P, o.count);
        if (index !== focused) {
          focused = index;
          o.onFocus?.(index);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
}
