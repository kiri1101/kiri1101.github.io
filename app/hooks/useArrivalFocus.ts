import { useEffect, useRef, useState } from "react";
import type { View } from "~/components/Hud";
import { afterFirstRender } from "~/lib/first-render";

/** How long the page keeps trying to focus a target the scroll loop has not shown yet. */
const TRY_FOR_MS = 1500;

/**
 * After "Back to orbit" (any in-app arrival on /#<slug>), keyboard focus goes where the visitor now is instead of
 * staying on <body>: the HUD's title in the spiral, or the marked project in the list view (reduced motion, or no 3D
 * scene). It waits for the gallery's first render (`ready`), when the view is decided, then tries each frame until
 * the target is shown, for at most TRY_FOR_MS. If the view changes afterwards (a scene that gives up turns the
 * spiral into the list, and the HUD it leaves is inert), focus follows to the new view's target. It never takes focus
 * the visitor has put elsewhere, and a page load (a shared link) leaves focus alone, as on the case-study pages.
 */
export function useArrivalFocus(arrived: number | null, ready: boolean, view: View): void {
  // A page load renders before the root marks its first render; a client-side navigation after.
  const [viaApp] = useState(afterFirstRender);
  /** Where this hook put focus last; null before it has. */
  const placed = useRef<HTMLElement | null>(null);
  /** The visitor has moved focus themselves: hands off from then on. */
  const yielded = useRef(false);
  useEffect(() => {
    if (!viaApp || yielded.current || arrived === null || !ready) return;
    const until = performance.now() + TRY_FOR_MS;
    let raf = 0;
    const attempt = () => {
      const active = document.activeElement;
      if (active && active !== document.body && active !== placed.current) {
        yielded.current = true;
        return;
      }
      const target =
        view === "list"
          ? document.querySelector<HTMLElement>('#project-list a[aria-current="true"]')
          : document.getElementById("title");
      if (target && active === target) return;
      target?.focus({ preventScroll: true });
      if (target && document.activeElement === target) placed.current = target;
      else if (performance.now() < until) raf = requestAnimationFrame(attempt);
    };
    attempt();
    return () => cancelAnimationFrame(raf);
  }, [viaApp, arrived, ready, view]);
}
