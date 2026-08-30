/**
 * Site brand colors. These map to the brand CSS custom properties defined in
 * src/styles.css, which all semantic tokens (--primary, --background, ...) derive from.
 * Editing them from the admin panel re-themes the whole app without touching components.
 */
export type BrandTheme = {
  forest: string;
  forest_deep: string;
  sage: string;
  mint: string;
  beige: string;
  beige_card: string;
  cream: string;
  gold: string;
};

export const THEME_SETTINGS_KEY = "theme";

export const DEFAULT_THEME: BrandTheme = {
  forest: "#1d442f",
  forest_deep: "#0e2d1d",
  sage: "#638370",
  mint: "#a4c3b0",
  beige: "#f2eade",
  beige_card: "#e8dcca",
  cream: "#fcf8f0",
  gold: "#c19e68",
};

export const THEME_KEYS = Object.keys(DEFAULT_THEME) as (keyof BrandTheme)[];

const CSS_VAR: Record<keyof BrandTheme, string> = {
  forest: "--forest",
  forest_deep: "--forest-deep",
  sage: "--sage",
  mint: "--mint",
  beige: "--beige",
  beige_card: "--beige-card",
  cream: "--cream",
  gold: "--gold",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function normalizeTheme(input: unknown): BrandTheme {
  const raw = (input ?? {}) as Partial<Record<keyof BrandTheme, unknown>>;
  const out = { ...DEFAULT_THEME };
  for (const key of THEME_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && HEX.test(value.trim())) out[key] = value.trim().toLowerCase();
  }
  return out;
}

/** Applies brand colors as inline CSS variables on <html>. */
export function applyTheme(theme: BrandTheme) {
  if (typeof document === "undefined") return;
  const style = document.documentElement.style;
  for (const key of THEME_KEYS) style.setProperty(CSS_VAR[key], theme[key]);
}

export function clearAppliedTheme() {
  if (typeof document === "undefined") return;
  const style = document.documentElement.style;
  for (const key of THEME_KEYS) style.removeProperty(CSS_VAR[key]);
}
