/**
 * Runs `cb` once, after the browser has recorded the page's first contentful paint, so whatever it requests
 * cannot compete with the first screen. Where paint timing is missing it waits two frames instead, and it never
 * waits longer than `maxWaitMs` (a page loaded in a background tab does not paint until it is shown).
 * Returns a function that cancels it.
 */
export function afterFirstPaint(cb: () => void, maxWaitMs = 2000): () => void {
  let done = false;
  let observer: PerformanceObserver | undefined;
  let raf = 0;
  const run = () => {
    if (done) return;
    done = true;
    cancel();
    setTimeout(cb, 0);
  };
  const timer = setTimeout(run, maxWaitMs);
  const cancel = () => {
    observer?.disconnect();
    cancelAnimationFrame(raf);
    clearTimeout(timer);
  };

  const painted = (entries: PerformanceEntryList) => entries.some((e) => e.name === "first-contentful-paint");
  if (typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes?.includes("paint")) {
    if (painted(performance.getEntriesByType("paint"))) run();
    else {
      observer = new PerformanceObserver((list) => painted(list.getEntries()) && run());
      observer.observe({ type: "paint", buffered: true });
    }
  } else {
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(run);
    });
  }
  return () => {
    done = true;
    cancel();
  };
}
