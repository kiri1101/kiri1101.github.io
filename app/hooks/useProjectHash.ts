import { useCallback, useEffect, useState } from "react";
import { useNavigationType } from "react-router";
import { flyToProject } from "~/lib/scroll-unit";

export type Arrival = {
  /** The project the page arrived on, which the list view marks as "where you came from"; null when there is none. */
  arrived: number | null;
  /** Takes every change of the focused project: the mark stays only while that is the project the page arrived on. */
  focused: (index: number) => void;
};

/**
 * `/#<slug>` opens the galaxy on that project: a case study's "Back to orbit" link, or a shared link. It jumps there
 * before the scroll loop starts (call this before `useScrollPhases`), so the page does not fly through the hero to
 * get there. Back and forward to such an entry keep the position the visitor left, which ScrollRestoration has
 * already restored by now (its layout effect runs before this passive one).
 *
 * The arrival is "where you came from" only while it is still where the visitor is: the first focus on another
 * project (a scroll, or a pick in the list, whose flight passes the projects between) ends it for good. A restored
 * position on another project ends it at once.
 */
export function useProjectHash(slugs: string[]): Arrival {
  const navigationType = useNavigationType();
  const [arrived, setArrived] = useState<number | null>(null);
  useEffect(() => {
    let slug: string;
    try {
      slug = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    const index = slugs.indexOf(slug);
    if (index < 0) return;
    setArrived(index);
    if (navigationType === "POP" && window.scrollY > 0) return;
    flyToProject(index);
    // On mount only: the page's own anchor links (#about, #contact) change the hash later.
  }, []);
  const focused = useCallback((index: number) => setArrived((a) => (a === index ? a : null)), []);
  return { arrived, focused };
}
