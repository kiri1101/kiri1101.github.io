import { describe, expect, test } from "vitest";
import { cardsOnScreen } from "~/scene/cards";
import {
  cardsEnd,
  chromeAt,
  focusIndexAt,
  galleryChrome,
  galleryShown,
  ORB_STILL_UNTIL,
  phasesAt,
  scrollForProject,
  ss,
  TIMELINE,
  trackLength,
} from "./timeline";

describe("timeline", () => {
  test("track length matches the prototype", () => {
    expect(trackLength(12)).toBeCloseTo(12.0);
    expect(trackLength(15)).toBeCloseTo(13.5);
    expect(trackLength(1)).toBeCloseTo(6.5);
  });

  test("focus and scroll are inverse", () => {
    for (let i = 0; i < 12; i++) expect(focusIndexAt(scrollForProject(i), 12)).toBe(i);
  });

  test("focus clamps to the first and last project", () => {
    expect(focusIndexAt(0, 12)).toBe(0);
    expect(focusIndexAt(99, 12)).toBe(11);
  });

  test("hole fully open after 3.15", () => expect(phasesAt(3.2).hole).toBe(1));

  test("monogram fully formed at P = 1", () => expect(phasesAt(1).mono).toBeCloseTo(1));

  test("smoothstep clamps and eases", () => {
    expect(ss(1, 2, 0)).toBe(0);
    expect(ss(1, 2, 3)).toBe(1);
    expect(ss(1, 2, 1.5)).toBeCloseTo(0.5);
  });

  test("the page turns dark just before the black hole opens", () => {
    expect(phasesAt(2.85).onDark).toBe(false);
    expect(phasesAt(2.86).onDark).toBe(true);
  });

  test("the deep field (and its credit) is in before the black hole opens, and stays to the end of the track", () => {
    expect(phasesAt(2.4).space).toBe(0);
    expect(phasesAt(2.4).hole).toBe(0);
    expect(phasesAt(2.5).space).toBeGreaterThan(0.5); // the window onto it opens from 2.5
    expect(phasesAt(2.5).hole).toBe(0);
    expect(phasesAt(2.55).space).toBe(1);
    expect(phasesAt(trackLength(12)).space).toBe(1);
  });

  test("the first card is at the focus age at its scroll position", () => {
    expect(phasesAt(scrollForProject(0)).cardOffset).toBeCloseTo(3.0);
  });
});

describe("the end of the gallery (Ruling R44)", () => {
  test("its controls stay up on the last project and are gone before the outro scrolls in", () => {
    const end = cardsEnd(12);
    expect(chromeAt(scrollForProject(11), end)).toBe(1);
    expect(chromeAt(end, end)).toBe(0);
  });

  test("the HUD names the last project as long as any other: until its card would hand focus to a next one", () => {
    for (const count of [1, 12, 15]) {
      const end = cardsEnd(count);
      // Where focus would pass to one more project, as it passes from every card to the next.
      const handover = scrollForProject(count - 1) + TIMELINE.PER_CARD / 2;
      expect(focusIndexAt(handover + 1e-9, count + 1)).toBe(count);
      expect(chromeAt(handover - 0.1, end)).toBeCloseTo(1, 9);
      expect(chromeAt(handover, end)).toBeCloseTo(0, 9);
    }
  });

  test("the HUD never names a project whose card has gone: it shows only while the last card is on screen", () => {
    for (const count of [1, 12, 15]) {
      const end = cardsEnd(count);
      for (let P = scrollForProject(count - 1); P <= end; P += 0.005) {
        // Below 0.2 % the page hides the HUD outright (phase-dom's `fade`).
        if (chromeAt(P, end) > 0.002) expect(cardsOnScreen(phasesAt(P).cardOffset, count)).toContain(count - 1);
      }
    }
  });
});

describe("the gallery on screen (one threshold for the view switch and the list by default)", () => {
  const end = cardsEnd(12);
  const at = (P: number) => galleryShown(phasesAt(P).hudIn, P, end);

  test("its controls fade with the HUD and the last card", () => {
    expect(galleryChrome(phasesAt(scrollForProject(0)).hudIn, scrollForProject(0), end)).toBe(1);
    expect(galleryChrome(phasesAt(2).hudIn, 2, end)).toBe(0);
  });

  test("shown past half the fade: not in the hero or the black hole, yes on every card, no once the cards have gone", () => {
    expect(at(0)).toBe(false);
    expect(at(3)).toBe(false);
    expect(at(4.44)).toBe(false);
    expect(at(4.46)).toBe(true);
    for (let i = 0; i < 12; i++) expect(at(scrollForProject(i))).toBe(true);
    expect(at(end)).toBe(false);
    expect(at(trackLength(12))).toBe(false);
  });

  test("the orb is still a sphere, the poster's picture, until the morph starts", () => {
    expect(phasesAt(ORB_STILL_UNTIL).morph).toBe(0);
    expect(phasesAt(ORB_STILL_UNTIL + 0.01).morph).toBeGreaterThan(0);
  });
});
