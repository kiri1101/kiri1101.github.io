/**
 * Runs `cb` when the browser is next idle, at the latest after `timeout` ms. Safari has no requestIdleCallback, so it
 * waits the timeout there. Returns a cancel function.
 */
export function whenIdle(cb: () => void, timeout: number): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(cb, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(cb, timeout);
  return () => clearTimeout(id);
}
