"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getInitialPreference(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    // SSR / non-DOM environments: assume motion is allowed and let the effect
    // correct it on the client after hydration.
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

/**
 * Tracks the user's `prefers-reduced-motion: reduce` preference.
 *
 * Returns `true` when the user/system has requested reduced motion. The value
 * is read synchronously on mount and kept in sync via a media-query listener,
 * so consumers (e.g. Chart.js animation config) can render directly in their
 * final state with zero animation for both the initial render and subsequent
 * updates (Requirement 14.5).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(getInitialPreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);

    // Sync immediately in case the preference changed between the initial
    // render and effect execution.
    onChange();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    // Legacy fallback for older browsers.
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return reduced;
}
