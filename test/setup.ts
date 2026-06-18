import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import fc from "fast-check";

// Reduce the number of generated examples per property so the property-based
// suites (especially the render-heavy chart/reduced-motion ones) run quickly
// and don't time out under parallel load. Tests may still override numRuns
// locally if they need more. 25 examples keeps good coverage while being fast.
fc.configureGlobal({ numRuns: 25 });

// Unmount React trees and clear the DOM between tests.
afterEach(() => {
  cleanup();
  resetMatchMedia();
});

// jsdom does not implement matchMedia. Provide a controllable stub so tests can
// force `prefers-color-scheme` and `prefers-reduced-motion` queries.
type MatchMediaOverrides = {
  reducedMotion?: boolean;
  colorScheme?: "light" | "dark";
};

let mediaOverrides: MatchMediaOverrides = {};

function evaluateQuery(query: string): boolean {
  if (query.includes("prefers-reduced-motion")) {
    const wantsReduce = query.includes("reduce");
    return wantsReduce ? mediaOverrides.reducedMotion === true : mediaOverrides.reducedMotion !== true;
  }
  if (query.includes("prefers-color-scheme")) {
    const scheme = mediaOverrides.colorScheme ?? "light";
    return query.includes(scheme);
  }
  return false;
}

/**
 * Configure the matchMedia stub for the current test. Call with no args (or via
 * the afterEach hook) to reset to defaults.
 */
export function setMatchMedia(overrides: MatchMediaOverrides = {}) {
  mediaOverrides = overrides;
}

function resetMatchMedia() {
  mediaOverrides = {};
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn((query: string) => {
    const listeners = new Set<(e: MediaQueryListEvent) => void>();
    return {
      get matches() {
        return evaluateQuery(query);
      },
      media: query,
      onchange: null,
      addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;
  }),
});

// next-themes and various components rely on these observers which jsdom lacks.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// framer-motion's `whileInView` relies on IntersectionObserver, which jsdom does
// not implement. Provide a no-op stub so motion components mount in tests.
if (!("IntersectionObserver" in globalThis)) {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    class {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds: ReadonlyArray<number> = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
}

if (!("matchMedia" in window)) {
  /* covered above */
}
