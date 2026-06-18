"use client";

import React from "react";
import { MotionConfig, type Transition } from "framer-motion";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Centralized motion language for the app (Requirement 16).
 *
 * All reveal / stagger / hover timings live here so every surface shares one
 * motion vocabulary and a single reduced-motion guard. Components consume the
 * `useReveal` / `useStaggerItem` presets instead of hand-rolling framer-motion
 * `initial` / `animate` / `transition` props, and the whole tree is wrapped in
 * `MotionProvider` so framer-motion itself also honors the user's
 * `prefers-reduced-motion` setting.
 */

// Page / section reveals play within the 0.18–0.5s window (Requirement 16.1).
export const REVEAL_DURATION = 0.4;
// Each staggered list item animates within the 0.18–0.5s window (Requirement 16.2).
export const STAGGER_ITEM_DURATION = 0.32;
// Per-item delay step for staggered entrances. Kept small so the last item in a
// reasonably sized list still completes promptly.
export const STAGGER_STEP = 0.06;
// Hover feedback uses color/opacity transitions within 0.15–0.3s (Requirement 16.4).
export const HOVER_DURATION = 0.2;
// Reduced motion collapses every animation to its final state within 0.01s
// (Requirement 16.3). 0.01s === 10ms, comfortably under the ceiling.
export const REDUCED_DURATION = 0.01;

// Vertical offset for the rise-in reveal. Disabled under reduced motion so no
// transform-driven motion occurs.
const REVEAL_OFFSET = 16;
const STAGGER_OFFSET = 8;

export interface MotionPreset {
  initial: Record<string, number>;
  animate: Record<string, number>;
  transition: Transition;
}

const FINAL_STATE = { opacity: 1, y: 0 } as const;
const reducedPreset: MotionPreset = {
  initial: { ...FINAL_STATE },
  animate: { ...FINAL_STATE },
  transition: { duration: REDUCED_DURATION, delay: 0 },
};

/**
 * Pure builder for the page / section reveal preset (Requirement 16.1 / 16.3).
 * Use this inside loops or alongside a single `useReducedMotion()` read; the
 * `useReveal` hook is a convenience wrapper for single-use call sites.
 */
export function revealPreset(reduced: boolean, delay = 0): MotionPreset {
  if (reduced) return reducedPreset;
  return {
    initial: { opacity: 0, y: REVEAL_OFFSET },
    animate: { ...FINAL_STATE },
    transition: { duration: REVEAL_DURATION, delay },
  };
}

/**
 * Pure builder for a staggered list item's entrance (Requirement 16.2 / 16.3).
 * Call `useReducedMotion()` once in the component, then map items through this
 * builder so the rules of hooks are respected for variable-length lists.
 */
export function staggerItemPreset(reduced: boolean, index = 0): MotionPreset {
  if (reduced) return reducedPreset;
  return {
    initial: { opacity: 0, y: STAGGER_OFFSET },
    animate: { ...FINAL_STATE },
    transition: { duration: STAGGER_ITEM_DURATION, delay: index * STAGGER_STEP },
  };
}

/**
 * Page / section reveal preset (Requirement 16.1).
 *
 * Under reduced motion the element starts in its final visual state and settles
 * within 0.01s with no transform (Requirement 16.3); otherwise it fades and
 * rises over a duration inside the 0.18–0.5s window. The returned object can be
 * spread onto a `motion.*` element, or its `animate` value can be wired to
 * `whileInView` for scroll-triggered reveals.
 */
export function useReveal(delay = 0): MotionPreset {
  return revealPreset(useReducedMotion(), delay);
}

/**
 * Per-item entrance for staggered lists (Requirement 16.2).
 *
 * `index` controls the stagger offset; each item's duration stays inside the
 * 0.18–0.5s window. Under reduced motion the item renders in its final state
 * with no offset and a ~0.01s transition (Requirement 16.3).
 */
export function useStaggerItem(index = 0): MotionPreset {
  return staggerItemPreset(useReducedMotion(), index);
}

/**
 * App-wide motion provider.
 *
 * `reducedMotion="user"` makes every framer-motion component honor the user's
 * `prefers-reduced-motion` setting, disabling transform/layout animations
 * across the app. This is defense-in-depth on top of the per-component presets
 * above and the global CSS guard in `globals.css`, so any motion component that
 * does not (yet) use the presets still respects the preference.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
