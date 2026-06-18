// lib/theme-parity.property.test.ts
// Property-based test for Property 1: Theme parity (task 18.3).
//
// For any in-scope surface rendered in light and dark, primary and muted text
// resolve to design tokens meeting WCAG AA contrast (4.5:1), and no element
// depends on a single theme's contrast (both themes must pass independently).
//
// The canonical tokens live in `src/app/globals.css` (`:root` + `.dark`) and
// are mirrored by the token-resolution helper in `lib/theme-tokens.ts`. We
// exercise the resolver's per-theme values (`staticToken`, the known-good value
// the resolver returns for each token/theme) so the assertion tracks exactly
// what surfaces consume at runtime.
//
// **Validates: Requirements 2.1, 2.3, 2.4**
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  staticToken,
  type ThemeName,
  type ThemeToken,
} from "./theme-tokens";

// ---------------------------------------------------------------------------
// WCAG 2.x relative-luminance + contrast-ratio computation.
// Reference: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    throw new Error(`Expected an #rgb/#rrggbb color token but got: "${hex}"`);
  }
  const body = m[1];
  if (body.length === 3) {
    return {
      r: parseInt(body[0] + body[0], 16),
      g: parseInt(body[1] + body[1], 16),
      b: parseInt(body[2] + body[2], 16),
    };
  }
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
  };
}

function channelLuminance(c8: number): number {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_TEXT = 4.5;

// ---------------------------------------------------------------------------
// Arbitraries: every in-scope text-on-background pairing, across both themes.
// ---------------------------------------------------------------------------

const THEMES: readonly ThemeName[] = ["light", "dark"] as const;

// Primary + muted text are the foregrounds covered by Requirements 2.3 / 2.4.
const TEXT_TOKENS: readonly ThemeToken[] = ["--text", "--text-muted"] as const;

// The surfaces text is rendered against: app background, cards/sidebar/topbar,
// and inset/hover surfaces (Requirement 2.1).
const BG_TOKENS: readonly ThemeToken[] = [
  "--bg",
  "--surface",
  "--surface-2",
] as const;

const themeArb = fc.constantFrom(...THEMES);
const textArb = fc.constantFrom(...TEXT_TOKENS);
const bgArb = fc.constantFrom(...BG_TOKENS);

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("Property 1: theme parity (token contrast in light + dark)", () => {
  // Primary/muted text resolves to a token meeting AA contrast against any
  // in-scope surface, in whichever theme is active.
  // **Validates: Requirements 2.1, 2.3, 2.4**
  it("text-on-surface meets AA (4.5:1) in the active theme", () => {
    fc.assert(
      fc.property(themeArb, textArb, bgArb, (theme, textTok, bgTok) => {
        const fg = staticToken(textTok, theme);
        const bg = staticToken(bgTok, theme);
        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `${textTok} on ${bgTok} in ${theme} = ${ratio.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(AA_TEXT);
      })
    );
  });

  // No element depends on a single theme's contrast: every text/surface pairing
  // must clear AA in BOTH themes simultaneously, never relying on one theme.
  // **Validates: Requirements 2.3, 2.4**
  it("each pairing meets AA in light AND dark (no single-theme dependency)", () => {
    fc.assert(
      fc.property(textArb, bgArb, (textTok, bgTok) => {
        for (const theme of THEMES) {
          const ratio = contrastRatio(
            staticToken(textTok, theme),
            staticToken(bgTok, theme)
          );
          expect(
            ratio,
            `${textTok} on ${bgTok} in ${theme} = ${ratio.toFixed(2)}:1`
          ).toBeGreaterThanOrEqual(AA_TEXT);
        }
      })
    );
  });
});
