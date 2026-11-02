import { expect, test, type Page } from "@playwright/test";
import { scrollForProject, ss, trackLength } from "../../app/lib/timeline";
import { COUNT, idx, last } from "./projects";
import { expectSceneOff, sceneOff } from "./scene-switch";
import { scrollProbe } from "./scroll-probe";

// Tests about the DOM choreography run without the 3D scene; scene.spec.ts covers it.
test.beforeEach(({ page }) => sceneOff(page));
test.afterEach(expectSceneOff);

const unitOf = (page: Page) =>
  page.evaluate(() => document.getElementById("unit-probe")!.getBoundingClientRect().height);

async function scrollToP(page: Page, P: number) {
  const unit = await unitOf(page);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), P * unit);
}

const visibility = (page: Page, id: string) => expect(page.locator(`#${id}`));

test("at the top the later layers are hidden", async ({ page }) => {
  await page.goto("/en");
  for (const id of ["transit", "hud", "space", "horizon"]) {
    await visibility(page, id).toHaveCSS("visibility", "hidden");
  }
  await visibility(page, "list").toHaveCSS("opacity", "0"); // closed: clipped for screen readers, not visibility:hidden
  await visibility(page, "hero").toHaveCSS("visibility", "visible");
});

test("without the 3D scene, the black hole opens as a round window onto space, centred on the poster, with no CSS mask", async ({
  page,
}) => {
  await page.goto("/en");
  await scrollToP(page, 2.7);
  const read = () =>
    page.evaluate(() => {
      const hole = document.getElementById("hole")!;
      const poster = document.getElementById("orb-poster")!.getBoundingClientRect();
      const r = parseFloat(hole.style.width) / 2;
      const masked = [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((el) => {
          const cs = getComputedStyle(el) as CSSStyleDeclaration & { webkitMaskImage?: string };
          return [cs.maskImage, cs.webkitMaskImage].some((m) => m && m !== "none");
        })
        .map((el) => el.id || el.tagName);
      return {
        r,
        x: parseFloat(hole.style.left) + r,
        y: parseFloat(hole.style.top) + r,
        rounded: getComputedStyle(hole).borderTopLeftRadius,
        poster: { x: poster.left + poster.width / 2, y: poster.top + poster.height / 2 },
        view: { w: innerWidth, h: innerHeight },
        P: scrollY / document.getElementById("unit-probe")!.getBoundingClientRect().height,
        masked,
      };
    });
  // Settled once the disc has the radius this scroll position gives: rpx plus half the 1.5 px soft edge.
  const { view, P } = await read();
  const rpx = ss(2.5, 3.15, P) ** 2.1 * Math.hypot(view.w, view.h) * 1.05;
  await expect.poll(async () => (await read()).r).toBeCloseTo(rpx + 0.75, 1);
  const opening = await read();
  expect(opening.rounded).toBe("50%");
  expect(Math.abs(opening.x - opening.poster.x)).toBeLessThan(1);
  expect(Math.abs(opening.y - opening.poster.y)).toBeLessThan(1);
  expect(opening.masked).toEqual([]);
  await visibility(page, "studio").toHaveCSS("visibility", "visible");
  await visibility(page, "horizon").toHaveCSS("visibility", "visible");
  await visibility(page, "space").toHaveCSS("visibility", "visible");

  // Before it is fully open the hole already covers every corner: what it swallowed is hidden, and the
  // window is the whole stage.
  await scrollToP(page, 3.05);
  await visibility(page, "studio").toHaveCSS("visibility", "hidden");
  await visibility(page, "horizon").toHaveCSS("visibility", "hidden");
  const stage = await page.locator("#studio").evaluate((el) => el.getBoundingClientRect().width);
  await expect.poll(async () => (await read()).rounded).toBe("0px");
  expect((await read()).r * 2).toBeCloseTo(stage, 1);
  await visibility(page, "space").toHaveCSS("visibility", "visible");
});

test("the track is trackLength viewport heights tall", async ({ page }) => {
  await page.goto("/en");
  const unit = await unitOf(page);
  const track = await page.locator("#track").evaluate((el) => el.getBoundingClientRect().height);
  expect(track).toBeCloseTo(trackLength(COUNT) * unit, 0);
});

test("on the last project the hero and transit are gone and the HUD is up", async ({ page }) => {
  await page.goto("/en");
  await scrollToP(page, scrollForProject(COUNT - 1));
  await visibility(page, "transit").toHaveCSS("visibility", "hidden");
  await visibility(page, "hero").toHaveCSS("visibility", "hidden");
  await visibility(page, "hud").toHaveCSS("visibility", "visible");
  await expect(page.locator("#idx")).toHaveText(idx(COUNT));
  await expect(page.locator("#title")).toHaveText(last.title);
  await expect(page.locator("#cat")).toHaveText(/ · \d{4}$/);
  await expect(page.locator("header.site-header")).toHaveAttribute("data-dark", "");
});

test("the Work link lands on the first project", async ({ page, isMobile }) => {
  test.skip(isMobile, "the header shows only the contact link on small screens");
  await page.goto("/en");
  await page.getByRole("link", { name: "Work", exact: true }).click();
  await expect(page.locator("#idx")).toHaveText(idx(1));
  await visibility(page, "hud").toHaveCSS("visibility", "visible");
});

test("choosing a title in the list closes it and flies to that project", async ({ page }) => {
  await page.goto("/en");
  await scrollToP(page, scrollForProject(0));
  await expect(page.locator("#toggle")).toHaveClass(/\bon\b/);
  await page.getByRole("button", { name: "list" }).click();
  await expect(page.locator("#list")).toHaveClass(/\bon\b/);
  await page.locator("#project-list a", { hasText: last.title }).click();
  await expect(page.locator("#list")).not.toHaveClass(/\bon\b/);
  await expect(page.locator("#idx")).toHaveText(idx(COUNT));
  await expect(page.locator("#title")).toHaveText(last.title);
});
const topmostAtCentre = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  });

async function focusListButton(page: Page) {
  await scrollToP(page, scrollForProject(0));
  await expect(page.locator("#toggle")).toHaveClass(/\bon\b/);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.getByRole("button", { name: "list" }).focus();
}

test("keyboard only: switch, list, titles with a focus ring, fly", async ({ page, browserName }) => {
  // Safari does not Tab to links unless the user enables it, so there the titles are focused directly.
  const tabsToLinks = browserName !== "webkit";
  await page.goto("/en");
  if (tabsToLinks) {
    await scrollToP(page, scrollForProject(0));
    await expect(page.locator("#toggle")).toHaveClass(/\bon\b/);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const listButton = page.getByRole("button", { name: "list" });
    for (let i = 0; i < 15 && !(await listButton.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
  } else {
    await focusListButton(page);
  }
  await expect(page.getByRole("button", { name: "list" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#list")).toHaveClass(/\bon\b/);
  const titles = page.locator("#project-list a");
  const next = async (i: number) => {
    if (tabsToLinks) await page.keyboard.press("Tab");
    else await titles.nth(i).focus();
    await expect(titles.nth(i)).toBeFocused();
  };
  await next(0);
  const ring = await titles.first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  expect(ring.style).not.toBe("none");
  expect(ring.width).toBeGreaterThan(0);
  await next(1);
  await page.keyboard.press("Enter");
  await expect(page.locator("#list")).not.toHaveClass(/\bon\b/);
  await expect(page.locator("#idx")).toHaveText(idx(2));
});

test("Space activates the toggle", async ({ page }) => {
  await page.goto("/en");
  await focusListButton(page);
  await page.keyboard.press("Space");
  await expect(page.locator("#list")).toHaveClass(/\bon\b/);
  await expect(page.getByRole("button", { name: "list" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "spiral" }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#list")).not.toHaveClass(/\bon\b/);
});

test("Escape closes the list and returns focus to the switch", async ({ page }) => {
  await page.goto("/en");
  await scrollToP(page, scrollForProject(3));
  await page.getByRole("button", { name: "list" }).click();
  await expect(page.locator("#list")).toHaveClass(/\bon\b/);
  await page.locator("#project-list a").first().focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("#list")).not.toHaveClass(/\bon\b/);
  await expect(page.getByRole("button", { name: "list" })).toBeFocused();
  await expect(page.getByRole("button", { name: "spiral" })).toHaveAttribute("aria-pressed", "true");
});

/** Waits `n` animation frames: the scroll loop eases its P toward the scroll position a step each frame. */
const frames = (page: Page, n: number) =>
  page.evaluate(
    (n) =>
      new Promise<void>((done) => {
        const step = (k: number) => (k > 0 ? requestAnimationFrame(() => step(k - 1)) : done());
        step(n);
      }),
    n,
  );

/**
 * From now on, checks every animation frame that the list is closed and the switch presses "spiral", so a list that
 * opens for a single frame is caught. Returns a reader for what went wrong, with the eased P the page's layers were
 * following at that frame (the list and the switch follow it), and the scroll position it was easing toward.
 */
async function watchForList(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const log: string[] = [];
    (window as Window & { __listLog?: string[] }).__listLog = log;
    const list = document.getElementById("list")!;
    const spiral = document.querySelector('#toggle [data-view="spiral"]')!;
    const unit = document.getElementById("unit-probe")!.getBoundingClientRect().height;
    let was = "";
    const check = () => {
      const wrong = [
        list.classList.contains("on") ? "the list is open" : "",
        spiral.getAttribute("aria-pressed") === "true" ? "" : "the switch does not press spiral",
      ]
        .filter(Boolean)
        .join(", ");
      if (wrong && wrong !== was) {
        log.push(`${wrong} at eased P ${window.__orbitP?.toFixed(2)} (scrolled to P ${(scrollY / unit).toFixed(2)})`);
      }
      was = wrong;
      requestAnimationFrame(check);
    };
    check();
  });
  return () => page.evaluate(() => (window as Window & { __listLog?: string[] }).__listLog!);
}

test.describe("the scroll probe is for tests only", () => {
  /** Into the gallery, and a few frames after the scroll loop has drawn it there. */
  async function intoTheGallery(page: Page) {
    await page.goto("/en");
    await scrollToP(page, scrollForProject(0));
    await expect(page.locator("#hud")).toHaveCSS("visibility", "visible", { timeout: 15_000 });
    await frames(page, 3);
  }

  test("without its switch, the page writes no eased P, even while it scrolls", async ({ page }) => {
    await intoTheGallery(page);
    expect(await page.evaluate(() => window.__orbitP)).toBeUndefined();
    expect(await page.evaluate(() => "__orbitP" in window)).toBe(false);
  });

  test("with its switch, the page writes the eased P it has drawn", async ({ page }) => {
    await scrollProbe(page);
    await intoTheGallery(page);
    await expect.poll(() => page.evaluate(() => window.__orbitP)).toBeCloseTo(scrollForProject(0), 2);
  });
});

test.describe("the list view opens only when chosen, and closes with the view switch (Ruling R44)", () => {
  // Playwright's Windows WebKit draws this page at 2–7 fps and the smoothed scroll needs several frames per screen.
  const settle = { timeout: 15_000 };

  // The switch's buttons by selector: once the switch is hidden, role queries no longer find them.
  const spiralSwitch = (page: Page) => page.locator('#toggle [data-view="spiral"]');

  test("in spiral mode, from the last card to the outro heading, the list never opens by itself", async ({ page }) => {
    const list = page.locator("#list");
    const spiral = spiralSwitch(page);
    await scrollProbe(page); // the watcher logs the eased P
    await page.goto("/en");
    await scrollToP(page, scrollForProject(COUNT - 1));
    await expect(page.locator("#toggle")).toHaveClass(/\bon\b/, settle);
    await expect(page.locator("#idx")).toHaveText(idx(COUNT));
    const problems = await watchForList(page);

    // A visitor scrolling on, a tenth of a screen at a time, until the outro's heading is well up the screen.
    const last = trackLength(COUNT) - 0.4;
    for (let P = scrollForProject(COUNT - 1); P < last + 0.05; P += 0.1) {
      await scrollToP(page, P);
      await frames(page, 3);
      expect(await list.getAttribute("class"), `#list at P ${P.toFixed(2)}`).not.toMatch(/\bon\b/);
      expect(await spiral.getAttribute("aria-pressed"), `the switch at P ${P.toFixed(2)}`).toBe("true");
    }
    await expect(page.locator("#outro-heading")).toBeInViewport(settle);
    await expect.poll(() => topmostAtCentre(page, "#outro-heading"), settle).toBe(true);
    expect(await problems()).toEqual([]);
  });

  test("a list opened by hand closes when the switch hides on the way up, and the gallery comes back as the spiral", async ({
    page,
  }) => {
    const toggle = page.locator("#toggle");
    const list = page.locator("#list");
    await page.goto("/en");
    await scrollToP(page, scrollForProject(0));
    await expect(toggle).toHaveClass(/\bon\b/, settle);
    await page.getByRole("button", { name: "list" }).click();
    await expect(list).toHaveClass(/\bon\b/);
    await expect(page.locator("#hud")).toHaveJSProperty("inert", true);

    // Up toward the hero, where the HUD and the switch fade out (at P 4.2 the HUD has not started to fade in).
    await scrollToP(page, 4.2);
    await expect(toggle).not.toHaveClass(/\bon\b/, settle);
    await expect(list).not.toHaveClass(/\bon\b/, settle);
    await expect(list).not.toHaveClass(/\bon\b/, settle);
    await expect(spiralSwitch(page)).toHaveAttribute("aria-pressed", "true");

    // Back into the gallery: the spiral, not the list.
    await scrollToP(page, scrollForProject(0));
    await expect(toggle).toHaveClass(/\bon\b/, settle);
    await expect(page.locator("#hud")).toHaveCSS("visibility", "visible", settle);
    await expect(page.getByRole("button", { name: "spiral" })).toHaveAttribute("aria-pressed", "true");
    await expect(list).not.toHaveClass(/\bon\b/);
    await expect(page.locator("#hud")).toHaveJSProperty("inert", false);
  });

  test("a choice made while the switch fades out is ignored: no list outside the gallery", async ({ page }) => {
    const toggle = page.locator("#toggle");
    const list = page.locator("#list");
    await page.goto("/en");
    await scrollToP(page, scrollForProject(0));
    await expect(toggle).toHaveClass(/\bon\b/, settle);
    await scrollToP(page, 4.2);
    // The switch keeps focus and takes Enter for the 0.4 s of its fade-out. Activate "list" in the very frame the
    // gallery ends, as a keyboard press there would, so the check does not depend on this browser's frame rate.
    await page.evaluate(
      () =>
        new Promise<void>((done) => {
          const tick = () => {
            if (document.getElementById("toggle")!.classList.contains("on")) requestAnimationFrame(tick);
            else {
              document.querySelector<HTMLElement>('#toggle [data-view="list"]')!.click();
              done();
            }
          };
          tick();
        }),
    );
    await frames(page, 3);
    await expect(list).not.toHaveClass(/\bon\b/);
    await expect(list).not.toHaveClass(/\bon\b/);
    await expect(spiralSwitch(page)).toHaveAttribute("aria-pressed", "true");
    // Back in the gallery it is still the spiral.
    await scrollToP(page, scrollForProject(0));
    await expect(toggle).toHaveClass(/\bon\b/, settle);
    await expect(spiralSwitch(page)).toHaveAttribute("aria-pressed", "true");
    await expect(list).not.toHaveClass(/\bon\b/);
  });

  test("Tab from the list's last title goes on to the outro's call to action, and the list closes", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Safari tabs to links only when the visitor turns that on");
    // The list is an overlay that does not trap focus, and the outro is the next content on the page.
    const list = page.locator("#list");
    const cta = page.locator("#outro .cta");
    await page.goto("/en");
    await scrollToP(page, scrollForProject(0));
    await expect(page.locator("#toggle")).toHaveClass(/\bon\b/, settle);
    await page.getByRole("button", { name: "list" }).click();
    await expect(list).toHaveClass(/\bon\b/);
    await page.locator("#project-list a").last().focus();
    await page.keyboard.press("Tab");
    await expect(cta).toBeFocused();
    // Focus scrolls the page to it, past the gallery: the switch goes, and the list with it.
    await expect(page.locator("#toggle")).not.toHaveClass(/\bon\b/, settle);
    await expect(list).not.toHaveClass(/\bon\b/, settle);
    await expect(list).not.toHaveClass(/\bon\b/, settle);
    await expect(cta).toBeInViewport();
    expect(await topmostAtCentre(page, "#outro .cta")).toBe(true);
    await expect(cta).toBeFocused();
  });

  test.describe("without the 3D scene (tier 2)", () => {
    test.use({ reducedMotion: "reduce" });
    // Reduced motion is tier 2 on its own; lift the test switch so the page takes that path.
    test.beforeEach(({ page }) =>
      page.addInitScript(() => {
        window.__orbitSceneTest = undefined;
      }),
    );

    test("the list is the gallery's default, and a chosen view closes with the switch, up or down", async ({ page }) => {
      const toggle = page.locator("#toggle");
      const list = page.locator("#list");
      const listButton = page.getByRole("button", { name: "list" });
      const spiralButton = page.getByRole("button", { name: "spiral" });
      const leaveAndComeBack = async (away: number) => {
        await scrollToP(page, away);
        await expect(toggle).not.toHaveClass(/\bon\b/, settle);
        await expect(list).not.toHaveClass(/\bon\b/, settle);
        await scrollToP(page, scrollForProject(5));
        await expect(toggle).toHaveClass(/\bon\b/, settle);
      };
      await page.goto("/en");
      await scrollToP(page, scrollForProject(5));
      await expect(toggle).toHaveClass(/\bon\b/, settle);
      await expect(list).toHaveClass(/\bon\b/, settle);
      await expect(listButton).toHaveAttribute("aria-pressed", "true");

      for (const away of [4.2, trackLength(COUNT) + 0.2]) {
        // The list goes with the switch; back in the gallery it is the default again.
        await leaveAndComeBack(away);
        await expect(list).toHaveClass(/\bon\b/, settle);
        await expect(listButton).toHaveAttribute("aria-pressed", "true");

        // The spiral, chosen, lasts only while the switch is on screen: the gallery comes back as the list.
        await spiralButton.click();
        await expect(list).not.toHaveClass(/\bon\b/);
        await expect(spiralButton).toHaveAttribute("aria-pressed", "true");
        await leaveAndComeBack(away);
        await expect(list).toHaveClass(/\bon\b/, settle);
        await expect(listButton).toHaveAttribute("aria-pressed", "true");
      }

      // Past the gallery the outro's heading is on top: no list over it.
      await scrollToP(page, trackLength(COUNT) - 0.4);
      await expect(page.locator("#outro-heading")).toBeInViewport(settle);
      await expect.poll(() => topmostAtCentre(page, "#outro-heading"), settle).toBe(true);
    });
  });
});

test("past the gallery its controls are gone and about and contact are on top", async ({ page }) => {
  await page.goto("/en");
  await scrollToP(page, scrollForProject(COUNT - 1));
  await expect(page.locator("#toggle")).toHaveClass(/\bon\b/, { timeout: 15_000 });
  await scrollToP(page, trackLength(COUNT) + 0.2);
  await expect(page.locator("#list")).not.toHaveClass(/on/);
  await expect(page.locator("#hud")).toHaveCSS("visibility", "hidden", { timeout: 15_000 });
  await expect(page.locator("#toggle")).toHaveCSS("visibility", "hidden");
  await page.locator("#about-statement").scrollIntoViewIfNeeded();
  expect(await topmostAtCentre(page, "#about-statement")).toBe(true);
  await page.locator("#contact a").first().scrollIntoViewIfNeeded();
  expect(await topmostAtCentre(page, "#contact a")).toBe(true);
  await expect(page.locator("#toggle")).toHaveCSS("visibility", "hidden");
});

test("resizing keeps the focused project", async ({ page }) => {
  await page.goto("/en");
  await scrollToP(page, scrollForProject(7));
  await expect(page.locator("#idx")).toHaveText(idx(8));
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.width, height: Math.round(size.height * 0.7) });
  // The unit changes with the viewport, so the page must re-scroll to the same P (not merely keep the old pixel offset).
  await expect
    .poll(async () => page.evaluate(() => new Promise<number>((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() =>
        done(scrollY / document.getElementById("unit-probe")!.getBoundingClientRect().height))))),
    )
    .toBeCloseTo(scrollForProject(7), 1);
  await expect(page.locator("#idx")).toHaveText(idx(8));
});

test("a list opened by hand closes once the page scrolls on past the gallery", async ({ page }) => {
  // Playwright's Windows WebKit draws this page at 2–7 fps (measured, before and after the 3D scene) and the
  // smoothed scroll needs several frames per screen, so the flights start from the last project and get time.
  const settle = { timeout: 15_000 };
  await page.goto("/en");
  await scrollToP(page, scrollForProject(COUNT - 1));
  await expect(page.locator("#toggle")).toHaveClass(/\bon\b/, settle);
  await page.getByRole("button", { name: "list" }).click();
  await expect(page.locator("#list")).toHaveClass(/\bon\b/);

  const unit = await unitOf(page);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), (trackLength(COUNT) + 0.2) * unit);
  await expect(page.locator("#list")).not.toHaveClass(/on/, settle);
  await page.locator("#about-statement").scrollIntoViewIfNeeded();
  expect(await topmostAtCentre(page, "#about-statement")).toBe(true);

  // Back in the gallery the spiral is the chosen view again.
  await scrollToP(page, scrollForProject(COUNT - 1));
  await expect(page.locator("#hud")).toHaveCSS("visibility", "visible", settle);
  await expect(page.locator("#idx")).toHaveText(idx(COUNT));
  await expect(page.getByRole("button", { name: "spiral" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#list")).not.toHaveClass(/\bon\b/);
});

/** The credit shown on screen, and what the page has at its centre (it must be the credit itself, uncovered). */
async function visibleCredit(page: Page) {
  return page.evaluate(() => {
    // The page's credit (inert while the list covers it) or the list's (clipped away while the list is closed).
    const shown = [...document.querySelectorAll<HTMLElement>("#space-credit, .list .credit")].find(
      (el) => getComputedStyle(el).visibility === "visible" && !el.closest("[inert], #list:not(.on)") && el.getBoundingClientRect().width > 0,
    );
    if (!shown) return null;
    const r = shown.getBoundingClientRect();
    // The credit lets clicks through (pointer-events: none), which elementFromPoint honours; for this check only, the
    // credit takes part in hit testing, so what comes back is whatever is stacked on top of it.
    const before = shown.style.pointerEvents;
    shown.style.pointerEvents = "auto";
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    shown.style.pointerEvents = before;
    const cs = getComputedStyle(shown);
    return {
      text: shown.textContent,
      inList: !!shown.closest(".list"),
      onTop: !!hit && shown.contains(hit),
      fontSize: cs.fontSize,
      color: cs.color,
      // Its corner: distances from the viewport's right and bottom edges.
      corner: { right: Math.round(innerWidth - r.right), bottom: Math.round(innerHeight - r.bottom) },
    };
  });
}

const CREAM_62 = "rgba(242, 239, 232, 0.62)";
const INK_62 = "rgba(16, 24, 32, 0.62)";

/**
 * At this frame:
 * - whether any of the deep field shows: its layer is shown, the black hole's window onto it is open, and the closing
 *   sections do not cover the whole viewport;
 * - every credit that can be read: shown, at least half opaque, inside the viewport, not inert, and on top at its
 *   centre, with where it is;
 * - the page's own credit (#space-credit), if the page has one: where it is and where it belongs (the list credit's
 *   corner, lifted onto the closing sections' top edge once they are in), its colour, and whether the studio is gone.
 * With the eased P the layers follow.
 */
async function creditsOnScreen(page: Page) {
  return page.evaluate(() => {
    const space = getComputedStyle(document.getElementById("space")!);
    const hole = document.getElementById("hole")!.getBoundingClientRect();
    const afterTop = document.querySelector(".after")!.getBoundingClientRect().top;
    const deepField =
      space.visibility === "visible" && Number(space.opacity) > 0 && hole.width > 0 && hole.height > 0 && afterTop > 0;
    const opacity = (el: Element | null) => {
      let o = 1;
      for (; el; el = el.parentElement) o *= Number(getComputedStyle(el).opacity);
      return o;
    };
    const readable = [...document.querySelectorAll<HTMLElement>(".credit")].flatMap((el) => {
      const r = el.getBoundingClientRect();
      if (getComputedStyle(el).visibility !== "visible" || r.width === 0 || r.bottom <= 0 || r.top >= innerHeight) return [];
      if (el.closest("[inert]") || opacity(el) < 0.5) return [];
      // Credits let clicks through; for this check only, the credit takes part in hit testing.
      const before = el.style.pointerEvents;
      el.style.pointerEvents = "auto";
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      el.style.pointerEvents = before;
      if (!hit || !el.contains(hit)) return [];
      const who = el.id || (el.closest(".list") ? "list" : (el.closest("[id]")?.id ?? "?"));
      return [{ who, at: `${Math.round(r.left)},${Math.round(r.top)}` }];
    });
    const own = document.getElementById("space-credit");
    // The list's credit is laid out even while the list is hidden: the corner, 18 px up (14 px on a phone).
    const corner = document.querySelector(".list .credit")!.getBoundingClientRect();
    const pageCredit = own && {
      shown: getComputedStyle(own).visibility === "visible",
      right: own.getBoundingClientRect().right,
      bottom: own.getBoundingClientRect().bottom,
      belongsRight: corner.right,
      belongsBottom: Math.min(innerHeight, afterTop) - (innerHeight - corner.bottom),
      colour: getComputedStyle(own).color,
      studioGone: getComputedStyle(document.getElementById("studio")!).visibility === "hidden",
    };
    return { P: window.__orbitP, deepField, readable, pageCredit };
  });
}

/**
 * Scrolls to each P from `from` to `to` in steps of 0.1, waits for the layers to arrive there (the eased P) and for the
 * list and the credits to finish their fades, then checks the credit:
 * - exactly one line can be read wherever the deep field shows, and never two lines;
 * - two credits can be read at once only where they are one line: the list's, fading out over the page's at the same
 *   place to the pixel, when the gallery's controls leave in tier 2;
 * - the page's own credit is in the corner, or rides the closing sections' top edge, without a jump; ink while the
 *   studio shows, cream once the black hole has swallowed it.
 * Returns the eased P sampled.
 */
async function checkCreditFrom(page: Page, from: number, to: number): Promise<number[]> {
  const sampled: number[] = [];
  for (let k = 0; from + k * 0.1 <= to + 1e-6; k++) {
    const P = from + k * 0.1;
    await scrollToP(page, P);
    await page.waitForFunction((P) => Math.abs(window.__orbitP! - P) < 0.01, P, { timeout: 15_000 });
    await frames(page, 2); // the list's state for this P is rendered
    await page.waitForFunction(
      () => [...document.querySelectorAll("#list, .credit")].every((el) => el.getAnimations().length === 0),
      null,
      { timeout: 15_000 },
    );
    const at = await creditsOnScreen(page);
    const where = `scrolled to P ${P.toFixed(2)}, eased P ${at.P?.toFixed(3)}, deep field ${at.deepField ? "shows" : "covered"}`;
    const lines = [...new Set(at.readable.map((c) => c.at))];
    // Soft, so a failing run lists every P where the credit is missing, doubled or out of place.
    const seen = `${where}; readable: ${JSON.stringify(at.readable)}`;
    if (at.deepField) expect.soft(lines, seen).toHaveLength(1);
    else expect.soft(lines.length, seen).toBeLessThanOrEqual(1);
    const own = at.pageCredit;
    if (own?.shown) {
      expect.soft(Math.abs(own.right - own.belongsRight), `${where}: the credit's right edge`).toBeLessThanOrEqual(1);
      expect.soft(Math.abs(own.bottom - own.belongsBottom), `${where}: the credit's bottom edge`).toBeLessThanOrEqual(1);
      expect.soft(own.colour, `${where}: the credit's colour`).toBe(own.studioGone ? CREAM_62 : INK_62);
    }
    sampled.push(at.P ?? NaN);
  }
  return sampled;
}

/**
 * The deep field's credit over both stretches where the HUD did not carry it: the black hole and the transit title,
 * then the end of the gallery and the closing sections scrolling in.
 */
/** Where the credit check's late range starts: the last 1.6 screens of the track. */
const LATE_FROM = trackLength(COUNT) - 1.6;

async function creditEverywhere(page: Page) {
  test.setTimeout(240_000); // Windows WebKit draws this page at 2–7 fps; each step waits for the eased P
  await scrollProbe(page);
  await page.goto("/en");
  await page.waitForFunction(() => typeof window.__orbitP === "number", null, { timeout: 15_000 });
  const early = await checkCreditFrom(page, 2.4, 4.6);
  const late = await checkCreditFrom(page, LATE_FROM, trackLength(COUNT));
  // Both ranges were walked by the layers themselves, not only by the scroll position.
  expect(Math.min(...early)).toBeCloseTo(2.4, 1);
  expect(Math.max(...early)).toBeCloseTo(4.6, 1);
  expect(Math.min(...late)).toBeCloseTo(LATE_FROM, 1);
  expect(Math.max(...late)).toBeCloseTo(trackLength(COUNT), 1);
}

test.describe("the deep field's credit is on screen wherever the deep field shows, one line at a time", () => {
  // The desktop projects are 1440×900; the phone projects run this at their own size too.
  test("spiral mode, at the project's size", async ({ page }) => {
    await creditEverywhere(page);
  });

  test.describe("at 390×844", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("spiral mode", async ({ page, isMobile }) => {
      test.skip(!isMobile, "the phone size runs in the phone projects");
      await creditEverywhere(page);
    });
  });

  test.describe("without the 3D scene (tier 2, where the gallery is the list)", () => {
    test.use({ reducedMotion: "reduce" });
    // Reduced motion is tier 2 on its own; lift the test switch so the page takes that path.
    test.beforeEach(({ page }) =>
      page.addInitScript(() => {
        window.__orbitSceneTest = undefined;
      }),
    );

    test("at the project's size", async ({ page }) => {
      await creditEverywhere(page);
    });

    test.describe("at 390×844", () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test("on a phone", async ({ page, isMobile }) => {
        test.skip(!isMobile, "the phone size runs in the phone projects");
        await creditEverywhere(page);
      });
    });
  });
});

test.describe("the deep-field credit stays above the list overlay", () => {
  const CREDIT = "Background: Webb's First Deep Field · NASA, ESA, CSA, STScI";

  test("in spiral view and after switching to the list", async ({ page }) => {
    await page.goto("/en");
    await scrollToP(page, scrollForProject(0));
    await expect(page.locator("#toggle")).toHaveClass(/\bon\b/);
    await expect(page.locator("#hud")).toHaveCSS("visibility", "visible");
    // It turned from ink to cream on the way down, once the black hole had swallowed the studio.
    await expect(page.locator("#space-credit")).toHaveCSS("color", CREAM_62);
    const spiral = await visibleCredit(page);
    expect(spiral).toMatchObject({ text: CREDIT, inList: false, onTop: true });

    await page.getByRole("button", { name: "list" }).click();
    await expect(page.locator("#list")).toHaveClass(/\bon\b/);
    await expect.poll(async () => (await visibleCredit(page))?.inList).toBe(true);
    const list = await visibleCredit(page);
    // Same words, same 10 px cream at 62%, and nothing on top of it.
    expect(list).toEqual({ ...spiral, inList: true });
  });

  test.describe("with reduced motion (the list is the default view)", () => {
    test.use({ reducedMotion: "reduce" });

    test("the list's credit is on top", async ({ page }) => {
      // Reduced motion is tier 2 on its own; lift the test switch so the page takes that path.
      await page.addInitScript(() => {
        window.__orbitSceneTest = undefined;
      });
      await page.goto("/en");
      await scrollToP(page, scrollForProject(0));
      await expect(page.locator("#list")).toHaveClass(/\bon\b/);
      await expect.poll(async () => (await visibleCredit(page))?.onTop).toBe(true);
      expect(await visibleCredit(page)).toMatchObject({ text: CREDIT, inList: true, fontSize: "10px", color: "rgba(242, 239, 232, 0.62)" });
    });
  });
});
