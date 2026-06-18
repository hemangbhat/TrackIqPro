# TrackIQ — Design System

> **Premium UI upgrade (Stitch reference):** All eight surfaces (Landing,
> Dashboard, Jobs, Job Details, Offers, Notes, Pricing, Settings) were lifted to
> a production-grade premium aesthetic derived from the Google Stitch reference
> screens — deep-navy glassmorphism in dark mode, indigo brand accent, Geist/
> Inter/JetBrains Mono type, bento layouts, and gradient call-to-action bands.
> Reference HTML for each screen lives in `.stitch-ref/`.

## 1. Principles
- Premium SaaS feel: calm surfaces, clear hierarchy, generous spacing, frosted
  glass panels with subtle gradient hairline borders.
- Content-first: charts and data legible in both themes.
- Motion is subtle and purposeful; respects `prefers-reduced-motion`.
- Accessibility: labeled controls, visible focus rings, color-independent status.

## 2. Theming (CSS variables, light/dark)
Defined in `src/app/globals.css`; dark mode via `.dark` class (next-themes).
Token values are mirrored in `lib/theme-tokens.ts` (consumed by chart colors and
the theme-parity property test).

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

Helper classes: `.surface`, `.surface-2`, `.text-muted`, `.skeleton`.

**Premium effect utilities** (token-driven, work in both themes):
`.glass-panel` (frosted card), `.gradient-border` (1px hairline), `.hero-gradient`
(radial brand glow), `.accent-orb` (blurred glow orb), `.cta-gradient` (indigo
call-to-action band).

## 3. Color & Status
- **Brand/accent:** Indigo (`#6366f1` light / `#c0c1ff` dark); primary buttons,
  active nav, focus rings, primary chart series.
- **Stage/status badges:** applied=blue, screening=amber, interview=violet,
  offer/accepted=emerald, rejected=rose, withdrawn=slate, pro=indigo.

## 4. Typography
- Self-hosted via `next/font/google` (configured in `src/app/layout.tsx`), exposed
  as CSS variables consumed by `globals.css`:
  - **Geist** (`--font-geist` → `.font-display`) — headings & brand.
  - **Inter** (`--font-inter` → body default) — body copy.
  - **JetBrains Mono** (`--font-jetbrains` → `.font-mono-label`) — uppercase
    eyebrow labels and meta.
- Scale: page title `text-2xl/3xl font-bold`, section `font-semibold`, body
  `text-sm`, meta `text-xs text-muted`.

## 5. Spacing & Layout
- Page container `max-w-5xl/6xl/7xl`, padding `p-4 sm:p-6 lg:p-8`.
- Card radius `rounded-2xl`/`rounded-3xl`, control radius `rounded-lg`, pills
  `rounded-full`.
- Dashboard shell: fixed `w-64` glass sidebar (desktop) with brand + Add-job CTA
  + plan badge, sticky glass topbar with global search, mobile drawer below `lg`.
- Marketing shell: sticky glass topbar + multi-column footer.

## 6. Components (`components/ui`)
- **Button:** primary / secondary / ghost / danger; sm/md; loading spinner;
  `cursor-pointer`; focus-visible ring.
- **Card / surface** containers.
- **Badge:** tone-driven status pills.
- **Inputs:** `Input`, `Textarea`, `Select`, `Label`, `Field` (label + hint).
- **Modal:** focus-safe dialog, Escape to close, backdrop blur, motion.
- **Toast:** success/error/info, auto-dismiss, accessible live region.
- **Skeleton:** shimmer loaders.
- **EmptyState / ErrorState:** illustrated, with action / retry.
- **Spinner**, **icons** (SVG set; no emoji as UI icons).

## 7. Iconography
- Custom Lucide-style SVG set in `components/ui/icons.tsx`, 24×24 viewBox,
  `currentColor`, consistent stroke width. No emoji or icon fonts (Stitch
  Material Symbols are mapped to these SVGs).

## 8. Charts
- Line (applications timeline) and doughnut (stage breakdown), wrapped in
  `.glass-panel` containers.
- Theme-aware tick/grid/label colors derived from `lib/theme-tokens.ts` so they
  read in light and dark; primary series uses the indigo accent. Each series has
  a non-color distinction and an accessible text summary; animations disabled
  under `prefers-reduced-motion`.

## 9. Motion
- Framer Motion for page/section reveals and list stagger; durations 0.18–0.5s.
  Hover uses color/opacity only (no layout-shifting scale). Global
  `prefers-reduced-motion` guard in `globals.css`.

## 10. Responsive Breakpoints
- 375 (mobile), 768 (tablet), 1024 (sidebar appears), 1440 (max content).
- Sidebar collapses to a drawer below `lg`; tables collapse to one-record cards
  below `md`; grids reflow to single column.

## 11. Accessibility Checklist
- All inputs have associated labels; modals/drawers have `aria-modal` + label,
  focus trap, Escape-to-close, and focus restore.
- Focus-visible indigo rings on interactive elements.
- Status conveyed by text + color (not color alone).
- Theme toggle stable across hydration; reduced-motion honored.

## 12. Stitch Reference Mapping
Each surface refines a premium Stitch screen (project `3095733913998128134`,
HTML cached in `.stitch-ref/`):

| Surface | Stitch screen |
|---------|---------------|
| Landing | Premium Landing Page |
| Dashboard | Premium Dashboard |
| Jobs | Premium Jobs Explorer |
| Job Details | Premium Job Details |
| Offers | Premium Offer Comparison |
| Notes | Premium Interview Notes |
| Pricing | Premium Pricing & Billing |
| Settings | Settings |
