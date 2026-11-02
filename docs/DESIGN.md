---
name: TrackIQ
description: Explainable job-search workspace. Public pages are set as a typographic grid; every score shows its work.
colors:
  ultramarine: "#2f3bff"
  ultramarine-dark: "#3440ff"
  ultramarine-text-dark: "#9da3ff"
  on-ultramarine: "#ffffff"
  on-ultramarine-muted: "#dfe1ff"
  paper: "#f7f7f4"
  paper-2: "#ecece6"
  surface: "#ffffff"
  ink: "#111111"
  ink-muted: "#4a4a45"
  hairline: "#cfcfc8"
  paper-dark: "#0e0e0e"
  paper-2-dark: "#1a1a19"
  surface-dark: "#171716"
  ink-dark: "#f2f2ee"
  ink-muted-dark: "#a9a9a2"
  hairline-dark: "#34342f"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(3.1rem, 9.2vw, 9rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4.75rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  numeral:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(6rem, 11vw, 11rem)"
    fontWeight: 800
    lineHeight: 0.78
    letterSpacing: "-0.04em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
    fontVariation: "\"wdth\" 112"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body-ui:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.375
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    letterSpacing: "0em"
rounded:
  none: "0px"
spacing:
  gutter: "24px"
  page-x-sm: "16px"
  page-x-md: "32px"
  page-x-lg: "48px"
  section-y: "80px"
  section-y-lg: "112px"
  container-max: "90rem"
components:
  button-primary:
    backgroundColor: "{colors.ultramarine}"
    textColor: "{colors.on-ultramarine}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-inverse:
    backgroundColor: "{colors.on-ultramarine}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "48px"
  button-inverse-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  button-outline-inverse:
    backgroundColor: "transparent"
    textColor: "{colors.on-ultramarine}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "48px"
  button-outline-inverse-hover:
    backgroundColor: "{colors.on-ultramarine}"
    textColor: "{colors.ink}"
  button-sm:
    padding: "8px 16px"
    height: "44px"
  total-field:
    backgroundColor: "{colors.ultramarine}"
    textColor: "{colors.on-ultramarine}"
    typography: "{typography.numeral}"
    rounded: "{rounded.none}"
    padding: "28px"
---

# Design System: TrackIQ

TrackIQ runs two visual systems while the redesign is in progress:

1. **The Typographic Grid** (primary, leading world). It governs the public pages: landing (`/`), pricing, privacy, unsubscribe, 404, the demo banner, the Open Graph image and the favicon. It is scoped to the `.grid-world` wrapper that `components/MarketingShell.tsx` renders, and its tokens live in the `.grid-world` / `.dark .grid-world` blocks of `src/app/globals.css`. Every new surface defaults to this world. The frontmatter above and sections Overview through Do's and Don'ts describe it.
2. **The Dashboard Interim System** (deep-navy glassmorphism). The signed-in dashboard still uses it until its own redesign pass. It is recorded under "Dashboard Interim System" at the end of this file. Don't extend it to new public surfaces.

## Overview

**Creative North Star: "The Score Sheet"**

TrackIQ never puts a number on screen without its reasons, so the public pages are set as Swiss information design. The mechanism itself is the image: a real job-fit score is drawn as a waterfall of signed contributions on the grid, and it ends in an ultramarine field that holds the total. Paper and ink carry the page. One committed ultramarine shows up as whole fields (the total column, the closing call-to-action band, the Pro column), never as small accents scattered around.

Type does the work that decoration does elsewhere. One heavy grotesk (Archivo, with a variable width axis) is set flush-left and tight, at poster sizes for headlines and numerals. Structure comes from 2px ink rules and a 12-column grid. Corners are square. There are no gradient fills, glows, blur, glass or shadows. Depth is never simulated: sections are separated by rules, and when emphasis is needed a section inverts (ink band or ultramarine field).

Motion is used once, on entry, and only where it explains something. Bars grow from the baseline, numerals count up, and ranked rows in the what-if simulator re-order on a damped spring. Nothing floats, loops or parallaxes.

The build differs from the direction contract in a few places, and the build is what this file records. The nav has four links and a "Get started" CTA. The hero headline runs the full container width. Hero subcopy takes columns 1 to 6 and the actions columns 8 to 12.

**Key Characteristics:**
- Paper (#f7f7f4) and ink (#111111), with one ultramarine (#2f3bff) used as a field.
- Archivo at weight 800 with -0.04em tracking for display and numerals. Numerals sit at 112% width.
- 2px ink rules as the primary structural device; 1px hairlines between list rows.
- Square corners everywhere (0px radius).
- Gains drawn as solid ink bars and losses as outlined, hatched bars, so a value's sign never depends on colour alone.
- Light and dark themes. Dark inverts paper and ink but keeps the ultramarine field.

## Colors

The palette is achromatic paper and ink plus a single saturated ultramarine, with hairline greys for secondary division.

### Primary
- **Field Ultramarine** (light #2f3bff, dark #3440ff): the only chromatic colour. It fills whole fields: the hero total column, the closing CTA band, the Pro plan column and Pro table column, the primary button, text selection, the favicon and the OG total. In the what-if ranking it marks only the rows whose rank just changed. White text on it (on-ultramarine).
- **Ultramarine Text** (light #2f3bff, dark #9da3ff): the same hue lifted for legibility on dark paper. Used for focus outlines, link underlines, the active nav underline, the caret, and ultramarine numerals set directly on paper (the 404, a moved rank).
- **Field Mist** (#dfe1ff): secondary text on the ultramarine field (captions, "/month", the summary under the total).

### Neutral
- **Cool Paper** (light #f7f7f4, dark #0e0e0e): page background.
- **Paper Shade** (light #ecece6, dark #1a1a19): bar tracks, such as the empty track behind each what-if score bar.
- **Sheet White** (light #ffffff, dark #171716): the raised-surface token that the demo's reused dashboard components read through the remapped `--surface`.
- **Press Ink** (light #111111, dark #f2f2ee): text, 2px rules, solid gain bars, range tracks and thumbs, and the inverted Engines band.
- **Muted Ink** (light #4a4a45, dark #a9a9a2): ledes, secondary copy, inactive nav links.
- **Hairline** (light #cfcfc8, dark #34342f): 1px row dividers in lists, tables and ledgers, plus the scrollbar thumb.

Fixed ink and white (#111111 / #ffffff) are used for hovers on the ultramarine field, so those hovers look the same in both themes.

### Named Rules
**The One Field Rule.** Ultramarine is applied as an area (a column, a band, a cell run), not as decoration. If it covers less than a full grid cell, it has to be carrying state (focus, the moved rank, the active link underline).

**The Remap Rule.** Inside `.grid-world`, the shared tokens (`--bg`, `--surface`, `--text`, `--accent`, `--border`, `--glass-*`, `--hero-glow`) are remapped to paper, ink and ultramarine. Glass and glow helpers are flattened (no backdrop-filter, no gradient hairline, no orb, no hero gradient). Reused dashboard components therefore pick up the grid world's colours, but they keep their own shapes until the dashboard redesign.

## Typography

**Display Font:** Archivo (variable, `wdth` axis), loaded through `next/font` as `--font-archivo`, with Helvetica Neue and Arial as fallbacks
**Body Font:** Archivo (same family)
**Label Font:** Archivo (same family; no mono)

**Character:** A single heavy neo-grotesk handles every role, from 9rem headlines down to 0.8125rem footnotes. Hierarchy comes from weight, size and width, never from a second typeface. The OG image renders Archivo 800 from a bundled TTF (`assets/fonts/Archivo-ExtraBold.ttf`, SIL OFL 1.1) because `next/og` can't read woff2.

### Hierarchy
- **Display** (800, clamp(3.1rem, 9.2vw, 9rem), line-height 0.9, -0.04em): one page headline (h1) per page. Interior pages use a smaller clamp with a 3 to 7.25rem ceiling and cap the measure at 13 to 18ch.
- **Headline** (800, clamp(2.5rem, 5vw, 4.75rem), 0.9, -0.04em): section h2s. The closing CTA steps up to clamp(2.75rem, 6.4vw, 6.5rem).
- **Numeral** (800, tabular lining figures, 112% width, line-height 0.78 to 0.85): scores, totals, prices, ranks, stage counts. Sizes range from 1.75rem (row values) to 11rem (the hero total) and 17rem (404).
- **Title** (700 to 800, 1.25 to 1.875rem, -0.01 to -0.02em): plan names, engine names, privacy section heads, sub-block h3s.
- **Body** (400, 1.125 to 1.25rem lede, line-height 1.625): ledes capped at 30 to 40rem. Privacy reading text is 1.0625rem at a 40rem measure.
- **Body UI** (600, 0.9375rem): nav links, form labels, diagram column labels, footer links. Footnotes and details are 0.8125 to 0.875rem.
- **Label** (700, 0.875rem, sentence case, no tracking): small data labels inside diagrams, tables, the what-if desk and footer column heads. It is the body face one step smaller. It never sits above a heading as a kicker.

### Named Rules
**The One Face Rule.** Every role on the public pages uses Archivo. No mono, no second display face, no system display fallback by choice.

**The Plain Label Rule.** Labels are sentence case and untracked. No uppercase with letter-spacing, no mono labels, and no small label stacked above a headline.

**The Tabular Numeral Rule.** Every figure that can be compared uses tabular lining numerals at weight 800, so columns of numbers align.

## Layout

The layout is a 12-column grid inside a container with a 90rem max width. Horizontal padding is 16px on mobile, 32px from `sm` and 48px from `lg`. The column gutter is 24px (`lg:gap-6`). Stacked mobile blocks use 32 to 48px gaps. Sections are full-bleed bands, separated by a 2px ink top rule or by a colour inversion. Vertical padding is 80px, rising to 112px from `lg`.

Composition is asymmetric and flush-left. Headlines take 7 to 8 columns. Supporting copy or actions sit at the right edge (for example a lede at columns 9 to 12, CTAs at 8 to 12) and align to the bottom with `self-end`. Lists, tables and the engines definition list are full-width ledgers: a 2px rule on top and 1px hairlines between rows.

The hero waterfall uses one grid column per contribution plus a total column 1.55 times wider. A shared 2px baseline runs across the gutters. Below `md`, it becomes a ledger: the ultramarine total comes first, then one row per reason, each with a signed numeral and a horizontal bar. The header is a sticky 64px bar with a 2px bottom rule. Touch targets are at least 44px.

Breakpoints are Tailwind's defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). Support starts at 375px wide.

### Named Rules
**The Rule-Not-Box Rule.** Group content with a 2px rule above it, not by enclosing it. The only fully bordered container is the two-up pricing plan grid (2px ink).

## Elevation & Depth

The system is completely flat. No box-shadows, no blur, no backdrop-filter, no gradient fills, no glows. Depth is replaced by three devices: 2px rules for structure, the inverted ink band (Engines) and the ultramarine field for emphasis, and the hatch pattern for negative values. The dashboard's film grain overlay is switched off on any page that contains `.grid-world`.

### Named Rules
**The Flat Sheet Rule.** If a surface needs to stand out, invert it or fill it. Never lift it. The hatch is drawn with a repeating linear gradient, but it is a pattern rather than a gradient fill, and it is a native device of this world.

## Shapes

All corners are square (0px), including buttons, fields, bars, range thumbs, scrollbar thumbs, the favicon and the OG card. Borders are 2px for structure and controls, and 1px hairline for row division. The recurring silhouette is the bar: solid ink for a gain, an outlined and hatched bar for a loss (2px currentColor border with -45deg stripes, 1.5px on and 5.5px off), and an ultramarine block for a total. The favicon repeats this as three white stepped bars on a baseline inside an ultramarine square.

## Components

### Buttons
Square, 2px, flat, and decisive.
- **Shape:** square corners (0px), 2px border, minimum height 48px (small size: 44px), weight 700, and an icon gap of 0.6rem when a functional icon (spinner, card) is present.
- **Primary:** an ultramarine fill with white text. Used for "Get started", "Create your free account" and "Go to dashboard".
- **Secondary:** a 2px ink outline with ink text on paper.
- **Inverse / Outline inverse:** for use on the ultramarine field. Inverse is a white fill with fixed ink text. Outline inverse is a white 2px outline with white text.
- **Hover:** fills swap to ink with paper text (on the field: ink with white, or white with ink). Hovers are wrapped in `(hover: hover) and (pointer: fine)` so taps never stick. Background, colour and border transition over 160ms on cubic-bezier(0.23, 1, 0.32, 1).
- **Press:** scale(0.97) while active and enabled.
- **Focus:** a 2px ultramarine-text outline with a 3px offset (world-wide).
- **Disabled:** 55% opacity and a not-allowed cursor.
- **Labels:** plain verbs, with no arrow icons or chevrons.

### Links
- Inline links (`.gw-link`) are bold ink with a 2px ultramarine underline offset 0.2em. On hover-capable pointers they turn ultramarine.

### Navigation
- A sticky 64px paper bar with a 2px ink bottom rule. The wordmark is "TrackIQ" in display weight at 112% width (1.375rem). Links are 0.9375rem at weight 600 in muted ink. Hover and the active page (`aria-current`) both show a 2px underline; the active one is ultramarine. On the right sit the theme toggle, a "Sign in" text link and the small primary button. Nav links are hidden below `md`.
- The footer has a 2px top rule. It shows a large wordmark (2.5 to 3.5rem) beside two link columns, each topped by a 2px rule and a sentence-case label, and ends with a hairline meta row.

### Inputs / Fields
- **Range (what-if weights):** a 2px ink track and an 18px square ink thumb in a 44px-tall hit area. The thumb turns ultramarine on focus-visible and while active. The value appears in a tabular numeral `<output>` beside the label.

### Tables / Ledgers
- A 2px ink rule under the header and 1px hairlines between rows. Feature rows use SVG check and cross icons, each paired with screen-reader text. The Pro column is an ultramarine field from header to last row.

### Score Waterfall (signature)
Every number comes from the real job-fit engine running on demo data. Gains are solid ink columns stacked from 0 toward the total. Each gain carries a signed numeral above it (1.75 to 2.75rem) that counts up. Losses hang below the baseline as hatched bars. The total column is an ultramarine field holding the score at display size, a "Score out of 100" label and the engine's summary. On entry, bars scale from the baseline (`scaleY`) over 900ms on cubic-bezier(0.16, 1, 0.3, 1), staggered 110ms per column. Numerals tick with a CSS `@property` integer counter. The real value always sits in screen-reader text, and the counted numeral is aria-hidden.

### What-if Desk (signature)
A fieldset of six range weights (4 columns) next to a ranked list of three sample offers (7 columns). Each row shows a rank numeral, the company, a 12px score bar (a `scaleX` transform on a paper-shade track) and the contribution breakdown. When a weight moves, the engine re-ranks the offers. Rows re-order with a framer-motion layout spring (stiffness 380, damping 38). Only the rows whose rank changed take ultramarine. A single visually hidden `role="status"` region announces the new order, and only when the order changes, not on every slider step.

### Plan Grid
Two plans side by side inside one 2px ink frame. Free is on paper. Pro is the ultramarine field. Prices are wide numerals (clamp(5rem, 9vw, 8rem)). Feature lists are ledgers. The "Current plan" tag is a label inside a 2px outline.

### Motion
- Only transform and opacity animate (plus colour on hover and press transitions). Nothing animates layout properties.
- Entry motion runs once: `scaleY` from the baseline (or from the top for losses), `scaleX` from the left for ledger bars, and numeral ticks, all 900ms on cubic-bezier(0.16, 1, 0.3, 1).
- The global reduced-motion guard collapses every animation and transition to its final state. Ticks show the final value when `@property` isn't supported.

## Do's and Don'ts

### Do:
- **Do** wrap every public surface in `MarketingShell` so it inherits `.grid-world` tokens, focus, selection and the flattened helpers.
- **Do** set headlines in Archivo 800 at -0.04em and 0.9 line-height, flush-left, with the measure capped in ch.
- **Do** use ultramarine (#2f3bff) as a whole field: a total, a CTA band, a plan column.
- **Do** separate sections and group content with 2px ink rules, and divide rows with 1px hairlines.
- **Do** draw losses as outlined, hatched bars and gains as solid ink, so sign never depends on colour.
- **Do** keep labels sentence case and untracked, in the body face (0.875rem, 700).
- **Do** give buttons press feedback with scale(0.97), and wrap every hover in `(hover: hover) and (pointer: fine)`.
- **Do** animate only transform and opacity, once on entry, and honour reduced motion.
- **Do** send one `role="status"` announcement per meaningful change (the what-if re-rank), not one per input step.
- **Do** compute every number shown on a public page with the real engine on demo data.

### Don't:
- **Don't** use gradient fills, glass, backdrop blur, glows, orbs or box-shadows in the grid world. The hatch pattern is the only exception.
- **Don't** round corners. Radius is 0px.
- **Don't** set labels in uppercase with letter-spacing, in mono, or as a kicker or eyebrow above a heading.
- **Don't** build meta strings joined with middle dots. Write a sentence or use separate elements.
- **Don't** add arrow or chevron icons to CTAs.
- **Don't** wrap cards in cards or put icons on coloured tiles.
- **Don't** introduce a second typeface on public pages (no Geist, Inter or JetBrains Mono).
- **Don't** spend ultramarine on small decorative accents. When it is smaller than a field, it means state.
- **Don't** animate width, height or position, and don't loop or float anything.

---

## App Surfaces (the same world, Operate mode)

The signed-in dashboard, the demo body, and the sign-in and sign-up pages now live in the Typographic Grid. `grid-world` sits on `<body>` (and on both shells), so every surface, including toasts and Clerk pages, reads the world's tokens. The rules below are how the world behaves where people work rather than decide.

### System-level remap (`src/app/globals.css`, `.grid-world`)
- **Indigo is the ultramarine.** Tailwind's `--color-indigo-*` scale points at `--ultra` / `--ultra-text`, so any `indigo-*` utility lands on the world's one accent. Semantic stage colours (blue applied, amber screening, violet interview, emerald offer and accepted, rose rejected) stay as status, never as decoration.
- **Square.** Every `--radius-*` token is `0`. Chips, pills and inputs with content are square; only empty dots stay round.
- **No decorative shadows.** `--tw-shadow` is cleared; focus rings are outlines and stay.
- **Ruled, not boxed.** `.glass-panel` and `.surface` render as a 2px ink rule over the content, flush left, no fill. `.surface-2` is a paper-2 well.
- **Labels.** The old mono uppercase eyebrow class renders as Archivo, bold, sentence case, untracked; eyebrows above headings were removed from the source.
- **Light-mode chip contrast.** `amber-600`, `emerald-600` and `rose-600` step down to 800/700 in light mode so small text on tinted chips clears 4.5:1; dark mode keeps the stock shades with `dark:*-300` text.

### Shell
- Fixed 256px rail with a 2px ink right rule: wordmark (Archivo 800, wide, 1.5rem), a full-width ultramarine **Add job**, then the nav as hairline-ruled rows. The active row is the ultramarine field with white text. Foot: Privacy and the real plan badge.
- Top bar: 64px, 2px ink rule under it, square search field, plan badge, an ultramarine icon key for quick add, the theme toggle, the Clerk user button.

### Components
- **Page titles:** `gw-display` at `clamp(2.25rem, 4vw, 3.5rem)`; a job's title at `clamp(1.75rem, 3vw, 2.75rem)`. Section titles in the demo at `clamp(1.75rem, 3vw, 2.5rem)`, 800.
- **Scores (`ScoreRing`):** no rings. A tabular numeral (size x 0.46) with its sublabel, over a square bar in the score's tone that grows from the left once.
- **KPI figures (`StatCard`):** a ruled figure: label (0.875rem, 700), numeral at 2.75rem, hint. No icon tiles.
- **Buttons (`Button`):** square, 2px border, 700. Primary ultramarine (hover ink), secondary ink outline (hover fills ink), ghost, danger rose-700, inverse on the field. Press `scale(0.97)`; hover gated to fine pointers; 2px ultramarine focus outline.
- **Fields:** square, 1px muted-ink border, 2px ultramarine focus outline, rose-700 border when invalid; labels 0.875rem 700.
- **Badges:** square, tinted, 700, capitalised.
- **Empty and error states:** left-aligned under a 2px rule (rose-700 for errors), plain icon, 1.25rem 800 title, one action.
- **Modal and drawer:** solid paper panels with a 2px ink frame (or edge) and a 2px rule under the title; the backdrop is a flat 60% black, no blur.
- **Upsell:** the ultramarine field with an inverse button, one link (no nested button).
- **Charts:** colours resolve from `<body>`; the line chart is drawn straight (`tension: 0`) so it never implies values between points.
- **Auth pages (`components/AuthFrame.tsx`):** a ruled header with the wordmark, the display line on the left, Clerk on the right, dressed through `appearance` (ultramarine primary, `0px` radius, Archivo, flat).

### Legacy tokens (history)
The pre-grid dashboard tokens still exist at `:root` / `.dark` and in `lib/theme-tokens.ts`, because the theme-parity property test pins them. Nothing renders with them any more: `.grid-world` remaps `--bg`, `--surface`, `--text`, `--text-muted`, `--border` and `--accent` everywhere. Retire them together with that test when convenient.

| Token | Light | Dark |
|-------|-------|------|
| `--bg` | `#f6f7fb` | `#081425` |
| `--surface` | `#ffffff` | `#152031` |
| `--surface-2` | `#f1f3f9` | `#1f2a3c` |
| `--text` | `#0f172a` | `#e7eefc` |
| `--text-muted` | `#475569` | `#9fb0cc` |
| `--border` | `#e2e8f0` | `#2a3548` |
| `--accent` | `#6366f1` | `#c0c1ff` |
| `--accent-strong` | `#4f46e5` | `#818cf8` |
