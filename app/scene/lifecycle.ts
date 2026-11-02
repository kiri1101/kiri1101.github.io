/**
 * The 3D scene's life on a canvas whose GPU context can be lost: build, go live, fall back to the poster, and
 * build again once when the context is restored. No DOM and no three.js, so its races are unit-tested with a
 * stubbed build (lifecycle.test.ts); `useScene` wires it to the page.
 */
export type Disposable = { dispose(): void };

export type LifecycleHooks<S extends Disposable> = {
  /**
   * Builds a scene. `isCurrent` turns false once the build is stale (a lost context, or stopped); a build may
   * check it and resolve null to give up early. Rejects when the scene cannot be built.
   */
  build: (isCurrent: () => boolean) => Promise<S | null>;
  /** A freshly built scene is current: wire it to the page. */
  live: (scene: S) => void;
  /** Back to the poster; the scene that was up, if any, is already disposed. */
  off: () => void;
  /** A build failed (`stale`: it no longer mattered, and the page was left alone). */
  failed?: (err: unknown, stale: boolean) => void;
};

export function sceneLifecycle<S extends Disposable>(hooks: LifecycleHooks<S>) {
  let stopped = false;
  let scene: S | null = null;
  let recreated = false;
  /**
   * Bumped by every build and every lost context. A build that ends under a newer number is stale: the context it
   * was built on was lost meanwhile, so it must never go live (Ruling R22).
   */
  let generation = 0;

  const fallBack = () => {
    scene?.dispose();
    scene = null;
    hooks.off();
  };

  const start = async (): Promise<void> => {
    const mine = ++generation;
    const current = () => !stopped && mine === generation;
    try {
      const built = await hooks.build(current);
      if (!built) return;
      if (!current()) {
        // Stopped, or the context was lost while this scene was built, so it would draw on a dead context.
        // The loss already brought the poster back; the restore builds the scene again.
        built.dispose();
        return;
      }
      scene = built;
      hooks.live(built);
    } catch (err) {
      // A stale build leaves the page alone, so it cannot tear down a newer scene.
      const stale = !current();
      hooks.failed?.(err, stale);
      if (!stale) fallBack();
    }
  };

  return {
    /** The scene that is up, if any. */
    get scene(): S | null {
      return scene;
    },
    start,
    /** The GPU context was lost: a build still running is now stale, and the poster comes back. */
    lost(): void {
      generation++;
      fallBack();
    },
    /** The context was restored: build again, once per page, unless a scene is already up. */
    restored(): Promise<void> | undefined {
      if (stopped || scene || recreated) return undefined;
      recreated = true;
      return start();
    },
    /** The page is leaving: no build goes live after this, and the scene that is up is disposed. */
    stop(): void {
      stopped = true;
      scene?.dispose();
      scene = null;
    },
  };
}
