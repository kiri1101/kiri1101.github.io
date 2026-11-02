/** The scroll choreography as pure functions of P, the scroll position in viewport heights. */

export const TIMELINE = { CARD_START: 3.6, PER_CARD: 0.5, FOCUS_AGE: 3.0 } as const;
const { CARD_START, PER_CARD, FOCUS_AGE } = TIMELINE;

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/** Smoothstep from 0 at `a` to 1 at `b`. */
export function ss(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export type Phases = {
  morph: number;
  mono: number;
  collapse: number;
  heroOut: number;
  hole: number;
  gIn: number;
  transit: number;
  hudIn: number;
  camera: number;
  cardOffset: number;
  onDark: boolean;
  /** The deep field (`#space`) fading in, just before the black hole opens; its on-screen credit follows it. */
  space: number;
};

/**
 * Until here the orb is the still sphere of the hero (the morph starts after it), which is the poster's picture:
 * the only stretch where the poster can replace the live orb without a jump.
 */
export const ORB_STILL_UNTIL = 0.15;

export function phasesAt(P: number): Phases {
  return {
    morph: ss(ORB_STILL_UNTIL, 0.95, P) + ss(1.0, 1.7, P),
    mono: ss(ORB_STILL_UNTIL, 0.95, P) - ss(1.0, 1.7, P),
    collapse: ss(1.95, 2.5, P),
    heroOut: ss(1.6, 2.05, P),
    hole: ss(2.5, 3.15, P),
    gIn: ss(2.55, 3.1, P),
    transit: ss(3.05, 3.35, P) * (1 - ss(3.8, 4.1, P)),
    hudIn: ss(4.3, 4.6, P),
    camera: ss(2.8, 3.6, P),
    cardOffset: (P - CARD_START) / PER_CARD + 0.4,
    onDark: P > 2.85,
    space: ss(2.4, 2.55, P),
  };
}

/** Scroll units from the last project's focus to `cardsEnd`: by then its card has left. */
const LAST_CARD_OUT = 0.6;

/** P at which the last card has left; the outro starts to scroll in after it. */
export function cardsEnd(count: number): number {
  return CARD_START + (count - 1 + FOCUS_AGE - 0.4) * PER_CARD + LAST_CARD_OUT;
}

/** Scroll length of the track in viewport heights: the cards plus one screen. */
export function trackLength(count: number): number {
  return cardsEnd(count) + 1;
}

/** The project whose card is nearest the focus point at scroll position P. */
export function focusIndexAt(P: number, count: number): number {
  const offset = (P - CARD_START) / PER_CARD + 0.4;
  return clamp(Math.round(offset - FOCUS_AGE), 0, count - 1);
}

/** The scroll position P at which project i is in focus. */
export function scrollForProject(i: number): number {
  return CARD_START + (i + FOCUS_AGE - 0.4) * PER_CARD;
}

/**
 * 1 while the gallery controls (HUD, view switch) belong on screen. They fade out as the last card leaves, by the point
 * where every other card hands the HUD to the next one: half a card past its focus. So the HUD never names a project
 * whose card has gone, even on a phone, where the card slides out of the frame before it fades; and the switch is gone
 * before the outro scrolls in over the galaxy (Ruling R44).
 */
export function chromeAt(P: number, cardsEndP: number): number {
  const end = cardsEndP - LAST_CARD_OUT + PER_CARD / 2;
  return 1 - ss(end - 0.1, end, P);
}

/** How far the gallery's controls (HUD, view switch) are faded in: in with the HUD, out with the last card. */
export function galleryChrome(hudIn: number, P: number, cardsEndP: number): number {
  return hudIn * chromeAt(P, cardsEndP);
}

/**
 * The gallery is on screen: its controls are more than half faded in. The view switch shows from here, and without
 * the 3D scene the list view is shown by default from here.
 */
export function galleryShown(hudIn: number, P: number, cardsEndP: number): boolean {
  return galleryChrome(hudIn, P, cardsEndP) > 0.5;
}
