/** Colour maths for the pages: WCAG contrast, hue, blending, and a project's readable highlight. Pure, no DOM. */

type Rgb = [number, number, number];

const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as Rgb;
};

const rgbToHex = (rgb: Rgb) =>
  `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0")).join("")}`;

function rgbToHsl([r, g, b]: Rgb): Rgb {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]: Rgb): Rgb {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

const luminance = (hex: string) => {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = hexToRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2 contrast ratio between two colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A colour's hue in degrees, and whether it has enough saturation for the hue to mean anything. */
export function hueOf(hex: string): [number, boolean] {
  const [h, s] = rgbToHsl(hexToRgb(hex));
  return [h, s > 0.15];
}

/** `top` at `alpha` over the opaque `bottom`, as the browser composites it (in sRGB), as an opaque hex colour. */
export function blend(top: string, alpha: number, bottom: string): string {
  const [t, b] = [hexToRgb(top), hexToRgb(bottom)];
  return rgbToHex(t.map((c, i) => c * alpha + b[i] * (1 - alpha)) as Rgb);
}

/** CSS `rgba()` for a hex colour. */
export function rgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgb(hex)
    .map((c) => Math.round(c * 255))
    .join(", ")}, ${alpha})`;
}

/** Contrast the project's highlight keeps on the page: AAA for its small uppercase category line. */
const HIGHLIGHT_CONTRAST = 7;

/**
 * The project's colour as the case study lights it on the dark page (category line, glow): the accent's deeper
 * end, lightened only as far as it takes to read at 7:1, so its hue stays the project's.
 */
export function highlightOf(accent: { from: string; to: string }, background: string): string {
  if (contrastRatio(accent.to, background) >= HIGHLIGHT_CONTRAST) return accent.to;
  const [h, s, l] = rgbToHsl(hexToRgb(accent.to));
  for (let light = l; light <= 1; light += 0.01) {
    const hex = rgbToHex(hslToRgb([h, s, light]));
    if (contrastRatio(hex, background) >= HIGHLIGHT_CONTRAST) return hex;
  }
  return "#ffffff";
}
