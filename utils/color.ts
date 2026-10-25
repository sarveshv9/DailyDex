/**
 * utils/color.ts
 *
 * Dependency-free color math utilities:
 * - Hex <-> RGB <-> Oklab <-> OKLCH conversions
 * - WCAG 2.1 relative luminance and contrast ratio calculations
 * - Lightness adjustment with contrast clamping
 * - Opaque alpha blending over backgrounds
 *
 * CRITICAL: Zero imports from react-native, expo, or stores.
 * Must run cleanly in plain Node.js / tsx environments.
 */

// --- RGB / HEX UTILS ---

export function normalizeHex(hex: string): string {
  let cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleaned.length !== 6) {
    // Fallback to black on malformed input
    return "#000000";
  }
  return `#${cleaned.toUpperCase()}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const norm = normalizeHex(hex).slice(1);
  const r = parseInt(norm.substring(0, 2), 16) / 255;
  const g = parseInt(norm.substring(2, 4), 16) / 255;
  const b = parseInt(norm.substring(4, 6), 16) / 255;
  return [r, g, b];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to255 = (c: number) => {
    const clamped = Math.min(255, Math.max(0, Math.round(c * 255)));
    return clamped.toString(16).padStart(2, "0").toUpperCase();
  };
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

// --- OKLAB / OKLCH CONVERSIONS ---

function sRgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSRgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

export function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = sRgbToLinear(r);
  const lg = sRgbToLinear(g);
  const lb = sRgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const ob = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  return [L, a, ob];
}

export function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [linearToSRgb(lr), linearToSRgb(lg), linearToSRgb(lb)];
}

export function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

export function oklchToOklab(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return [L, a, b];
}

export function hexToOklch(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const [L, a, o_b] = rgbToOklab(r, g, b);
  return oklabToOklch(L, a, o_b);
}

export function oklchToHex(L: number, C: number, H: number): string {
  const [oL, a, b] = oklchToOklab(L, C, H);
  const [r, g, ob] = oklabToRgb(oL, a, b);
  return rgbToHex(r, g, ob);
}

// --- WCAG CONTRAST AND LUMINANCE ---

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const lr = sRgbToLinear(r);
  const lg = sRgbToLinear(g);
  const lb = sRgbToLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(hex1);
  const lum2 = relativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- OPAQUE BLEND ---

export function blendOpaque(fgHex: string, bgHex: string, fgAlpha: number): string {
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);
  const alpha = Math.max(0, Math.min(1, fgAlpha));

  const r = fr * alpha + br * (1 - alpha);
  const g = fg * alpha + bg * (1 - alpha);
  const b = fb * alpha + bb * (1 - alpha);

  return rgbToHex(r, g, b);
}

// --- ACCENT CLAMPING & CONTRAST RESOLUTION ---

export interface ClampedColorResult {
  hex: string;
  wasAdjusted: boolean;
  deltaL: number;
}

/**
 * Ensures a color meets minRatio against backgroundHex.
 * In light mode: darkens if contrast is too low.
 * In dark mode: lightens if contrast is too low.
 */
export function clampForContrast(
  inputHex: string,
  backgroundHex: string,
  minRatio: number,
  mode: "light" | "dark"
): ClampedColorResult {
  const [origL, origC, origH] = hexToOklch(inputHex);
  let bestL = origL;
  let bestHex = normalizeHex(inputHex);
  const step = mode === "light" ? -0.015 : 0.015;

  // Helper to check if primary satisfies both:
  // 1) minRatio vs background
  // 2) at least one of #FFFFFF or #121212 achieves >= 4.5:1 on primary
  const isValidPrimary = (hex: string) => {
    const bgRatio = contrastRatio(hex, backgroundHex);
    if (bgRatio < minRatio) return false;
    const onWhite = contrastRatio("#FFFFFF", hex);
    const onDark = contrastRatio("#121212", hex);
    return Math.max(onWhite, onDark) >= 4.5;
  };

  if (isValidPrimary(inputHex)) {
    return { hex: normalizeHex(inputHex), wasAdjusted: false, deltaL: 0 };
  }

  for (let i = 0; i < 60; i++) {
    bestL = Math.max(0.05, Math.min(0.98, bestL + step));
    const c = bestL < 0.2 || bestL > 0.9 ? origC * 0.8 : origC;
    const testHex = oklchToHex(bestL, c, origH);
    if (isValidPrimary(testHex)) {
      bestHex = testHex;
      break;
    }
    bestHex = testHex;
  }

  const deltaL = Math.abs(bestL - origL);
  return {
    hex: bestHex,
    wasAdjusted: deltaL > 0.12,
    deltaL,
  };
}

/**
 * Derives onPrimary: picks near-black (#121212) or white (#FFFFFF), whichever has higher contrast.
 */
export function deriveOnPrimary(primaryHex: string): string {
  const contrastWhite = contrastRatio("#FFFFFF", primaryHex);
  const contrastDark = contrastRatio("#121212", primaryHex);
  return contrastWhite >= contrastDark ? "#FFFFFF" : "#121212";
}

/**
 * Derives primaryText:
 * Accent used AS text or icon against neutral surfaces and primarySoft.
 * Must achieve >= 4.5:1 against surface, primarySoft, and background.
 */
export function derivePrimaryText(
  primaryHex: string,
  surfaceHex: string,
  primarySoftHex: string,
  backgroundHex: string,
  mode: "light" | "dark"
): string {
  const surfaces = [surfaceHex, primarySoftHex, backgroundHex];
  const passesAll = (hex: string) => surfaces.every((s) => contrastRatio(hex, s) >= 4.5);

  if (passesAll(primaryHex)) {
    return normalizeHex(primaryHex);
  }

  const [origL, origC, origH] = hexToOklch(primaryHex);
  let currL = origL;
  const step = mode === "light" ? -0.015 : 0.015;
  let candidate = normalizeHex(primaryHex);

  for (let i = 0; i < 60; i++) {
    currL = Math.max(0.08, Math.min(0.96, currL + step));
    // Retain vivid hue while ensuring readability
    const c = Math.min(origC, mode === "light" ? 0.28 : 0.24);
    candidate = oklchToHex(currL, c, origH);
    if (passesAll(candidate)) {
      return candidate;
    }
  }

  // Fallback to highest contrast candidate
  return candidate;
}
