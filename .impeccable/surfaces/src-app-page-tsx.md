---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/pricing/page.tsx","src/app/privacy/page.tsx","src/app/unsubscribe/page.tsx","src/app/not-found.tsx","components/MarketingShell.tsx"]
---

# Public pages — landing (/), pricing, demo entry, privacy, unsubscribe, 404

Mode: Persuade (landing, pricing); Read (privacy). Audience: active job seekers mid-search.
Action: start free (sign-up) or open the no-sign-up demo. Proof: real engine output on demo data only; no invented logos, testimonials or counts.
Constraints: Next.js App Router, Tailwind v4, strict CSP (self-hosted fonts via next/font), light + dark themes, 375px+, reduced motion, existing tests assert copy/roles.
Memorable moment: the hero diagram — a job-fit score broken into signed columns on the grid, ending in the ultramarine total.
Unresolved: dashboard reskin is a later pass.

## Direction contract

THESIS: The score breakdown is the poster. Refuses the split hero with a screenshot in a glowing frame; the mechanism itself, set as Swiss information design, is the page.

OWN-WORLD: Cool off-white paper (#f7f7f4) and near-black ink, one committed ultramarine (#2f3bff) carrying whole fields (total column, CTA band, pricing Pro column). Heavy neo-grotesk (Archivo, wide/condensed axis) set flush-left, tight. 2px black rules, square corners, solid bars for gains, hatched outlined bars for losses. No gradients, glows, blur, shadows, cards-in-cards, icon tiles. Dark theme inverts paper to ink (#0e0e0e) with the same ultramarine field.

STORY: The visitor sees a real score explained in one glance, believes TrackIQ never asserts a number without reasons, and starts free or opens the demo.

FIRST VIEWPORT: Rule-topped nav (wordmark, three links, Sign in, ultramarine Start free). Headline "Every score shows its work." at ~9rem across 9 of 12 columns. Subcopy left cols 1-5; primary + demo actions at cols 7-12. Bottom band: full-width waterfall of signed contributions as grid columns, last 3 columns an ultramarine field with the total at display size.

FORM: Swiss International Typographic Style, candidate 7 of 7 on the ordered list; seed:9bb3d5abceafde9c. Signature interaction: the what-if section — sliders re-weight real offers, bars re-order with damped motion, only the moved item takes ultramarine. Motion grammar: bars grow from the baseline once on entry; numbers tick; nothing floats.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
