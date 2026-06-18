import React from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { setMatchMedia } from "./setup";

export type ThemeChoice = "light" | "dark";

export interface RenderWithThemeOptions extends Omit<RenderOptions, "wrapper"> {
  /** Force the active theme. Defaults to "light". */
  theme?: ThemeChoice;
  /** Force `prefers-reduced-motion: reduce`. Defaults to false. */
  reducedMotion?: boolean;
}

/**
 * Render a component wrapped in the app's ThemeProvider, with the ability to
 * force light/dark mode and the prefers-reduced-motion preference.
 *
 * The theme is forced by setting `forcedTheme` on next-themes (so it is applied
 * deterministically) and by toggling the `.dark` class plus a matchMedia stub
 * so that both class-based and media-query-based styling resolve correctly.
 */
export function renderWithTheme(
  ui: React.ReactElement,
  options: RenderWithThemeOptions = {}
): RenderResult {
  const { theme = "light", reducedMotion = false, ...renderOptions } = options;

  // Make matchMedia queries resolve to the forced preferences.
  setMatchMedia({ colorScheme: theme, reducedMotion });

  // Keep the documentElement class in sync with the forced theme so that
  // Tailwind `.dark` styles and CSS-variable tokens resolve as expected.
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NextThemesProvider
        attribute="class"
        forcedTheme={theme}
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from "@testing-library/react";
