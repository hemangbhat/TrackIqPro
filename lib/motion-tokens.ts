// lib/motion-tokens.ts
// The CSS motion tokens (globals.css :root) as framer-motion cubic-bezier
// arrays, so JS-driven motion uses the same curves as CSS.

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;
