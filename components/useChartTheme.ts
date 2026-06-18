"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  resolveToken,
  getAccentChartColors,
  withAlpha,
  type ThemeName,
} from "../lib/theme-tokens";

/**
 * Concrete chart colors derived from the active theme's design tokens.
 *
 * Chart.js renders to a canvas and cannot consume `var(--token)` directly, so
 * we resolve the tokens to concrete strings via `lib/theme-tokens` (which
 * applies the light-theme fallback per Requirement 2.8).
 *
 * Contrast (Requirement 14.2):
 *  - `text` / `textMuted` are used for labels and ticks. `--text-muted` is the
 *    token defined to meet AA (>= 4.5:1) against the surface in both themes.
 *  - `grid` is the muted token at 0.7 alpha, which keeps grid/axis lines at
 *    >= 3:1 against the chart background (surface) in both themes.
 */
export interface ChartTheme {
  /** Primary text token — high-contrast labels. */
  text: string;
  /** Muted text token — ticks/legend labels (>= 4.5:1). */
  textMuted: string;
  /** Grid + axis line color (>= 3:1). */
  grid: string;
  /** Surface token — used to separate doughnut arcs. */
  surface: string;
  /** Indigo-accent-driven colors for the primary series (Requirement 2.5). */
  accent: { line: string; fill: string; point: string };
}

function deriveChartTheme(fallbackTheme: ThemeName): ChartTheme {
  const textMuted = resolveToken("--text-muted", { fallbackTheme });
  return {
    text: resolveToken("--text", { fallbackTheme }),
    textMuted,
    grid: withAlpha(textMuted, 0.7),
    surface: resolveToken("--surface", { fallbackTheme }),
    accent: getAccentChartColors({ fallbackTheme }),
  };
}

/**
 * Returns chart colors for the active theme and re-derives them whenever the
 * resolved theme changes. The re-derivation runs in an effect after the
 * ThemeProvider has applied the theme class to `documentElement`, so
 * `getComputedStyle` reflects the active theme — well within the 500ms budget
 * required when the theme changes (Requirement 14.1).
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  const fallbackTheme: ThemeName = resolvedTheme === "dark" ? "dark" : "light";

  const [colors, setColors] = useState<ChartTheme>(() =>
    deriveChartTheme(fallbackTheme)
  );

  useEffect(() => {
    setColors(deriveChartTheme(fallbackTheme));
  }, [resolvedTheme, fallbackTheme]);

  return colors;
}
