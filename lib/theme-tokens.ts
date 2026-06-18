/**
 * Design-token resolution utility.
 *
 * The canonical CSS-variable design tokens are declared in
 * `src/app/globals.css` for the light theme (`:root`) and the dark theme
 * (`.dark`). This module mirrors those values in TypeScript and exposes a
 * resolver that reads the *active* theme's computed value at runtime, falling
 * back to the light-theme value whenever a token is missing or fails to
 * resolve.
 *
 * Requirement 2.8: IF a design token value is missing or fails to resolve for
 * the active theme, THEN apply the corresponding light-theme token value as a
 * fallback and render the affected element with no blank or unreadable area.
 *
 * This is the single source of truth consumed by chart color derivation and
 * any surface that needs a concrete token value (e.g. canvas-based charts that
 * cannot use `var(--token)` directly).
 */

export type ThemeName = "light" | "dark";

export type ThemeToken =
  | "--bg"
  | "--surface"
  | "--surface-2"
  | "--text"
  | "--text-muted"
  | "--border"
  | "--accent"
  | "--accent-strong";

/**
 * Light-theme token values. These mirror `:root` in `globals.css` and act as
 * the authoritative fallback for every token (Requirement 2.8).
 */
export const LIGHT_TOKENS: Record<ThemeToken, string> = {
  "--bg": "#f6f7fb",
  "--surface": "#ffffff",
  "--surface-2": "#f1f3f9",
  "--text": "#0f172a",
  "--text-muted": "#475569",
  "--border": "#e2e8f0",
  "--accent": "#6366f1",
  "--accent-strong": "#4f46e5",
};

/**
 * Dark-theme token values. These mirror `.dark` in `globals.css`.
 */
export const DARK_TOKENS: Record<ThemeToken, string> = {
  "--bg": "#081425",
  "--surface": "#152031",
  "--surface-2": "#1f2a3c",
  "--text": "#e7eefc",
  "--text-muted": "#9fb0cc",
  "--border": "#2a3548",
  "--accent": "#c0c1ff",
  "--accent-strong": "#818cf8",
};

const ALL_TOKENS = Object.keys(LIGHT_TOKENS) as ThemeToken[];

function tokenTable(theme: ThemeName): Record<ThemeToken, string> {
  return theme === "dark" ? DARK_TOKENS : LIGHT_TOKENS;
}

/**
 * Returns the static, known-good value for a token in a given theme. Always
 * returns a non-empty string; an unknown token resolves to the light `--text`
 * value so callers never receive a blank/unreadable color.
 */
export function staticToken(token: ThemeToken, theme: ThemeName = "light"): string {
  return tokenTable(theme)[token] ?? LIGHT_TOKENS[token] ?? LIGHT_TOKENS["--text"];
}

function isUnresolved(value: string | null | undefined): boolean {
  if (value == null) return true;
  const v = value.trim();
  if (v === "") return true;
  // CSS may report these for variables that are declared but have no usable value.
  if (v === "initial" || v === "inherit" || v === "unset") return true;
  return false;
}

/**
 * Resolves a single design token to a concrete color string.
 *
 * Resolution order:
 *   1. The computed value of the CSS custom property on `root` (the active
 *      theme as applied by the ThemeProvider).
 *   2. The static value for the supplied `fallbackTheme` (defaults to light).
 *   3. The light-theme value (Requirement 2.8 guarantee — never blank).
 *
 * Safe to call during SSR: when no DOM is available it returns the static
 * fallback value rather than throwing.
 */
export function resolveToken(
  token: ThemeToken,
  options: {
    root?: Element | null;
    fallbackTheme?: ThemeName;
  } = {}
): string {
  const { root, fallbackTheme = "light" } = options;
  const fallback = staticToken(token, fallbackTheme);

  const el =
    root ??
    (typeof document !== "undefined" ? document.documentElement : null);

  if (!el || typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
    return fallback;
  }

  try {
    const computed = window.getComputedStyle(el).getPropertyValue(token);
    if (isUnresolved(computed)) {
      // Token missing/unresolved for the active theme — fall back to light.
      return staticToken(token, "light");
    }
    return computed.trim();
  } catch {
    return staticToken(token, "light");
  }
}

/**
 * Resolves every design token at once, applying the light-theme fallback for
 * any token that is missing/unresolved.
 */
export function resolveTokens(
  options: { root?: Element | null; fallbackTheme?: ThemeName } = {}
): Record<ThemeToken, string> {
  const out = {} as Record<ThemeToken, string>;
  for (const token of ALL_TOKENS) {
    out[token] = resolveToken(token, options);
  }
  return out;
}

/**
 * Converts a `#rgb`/`#rrggbb` hex color to an `rgba(...)` string with the given
 * alpha. Non-hex inputs (e.g. already-rgb values) are returned unchanged when
 * an alpha cannot be applied, so the caller still receives a usable color.
 */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return color;

  let r: number;
  let g: number;
  let b: number;
  const body = match[1];
  if (body.length === 3) {
    r = parseInt(body[0] + body[0], 16);
    g = parseInt(body[1] + body[1], 16);
    b = parseInt(body[2] + body[2], 16);
  } else {
    r = parseInt(body.slice(0, 2), 16);
    g = parseInt(body.slice(2, 4), 16);
    b = parseInt(body.slice(4, 6), 16);
  }
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Derives the indigo-accent-driven color set used by the primary chart series.
 * Uses the resolver so the colors track the active theme and fall back to the
 * light-theme accent when a token is unresolved (Requirements 2.5, 2.8).
 */
export function getAccentChartColors(
  options: { root?: Element | null; fallbackTheme?: ThemeName } = {}
): { line: string; fill: string; point: string } {
  const accent = resolveToken("--accent", options);
  return {
    line: accent,
    fill: withAlpha(accent, 0.12),
    point: accent,
  };
}
