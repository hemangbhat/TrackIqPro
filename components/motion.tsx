"use client";

import React from "react";
import { MotionConfig } from "framer-motion";

/**
 * App-wide motion provider.
 *
 * `reducedMotion="user"` makes every framer-motion component honor the user's
 * `prefers-reduced-motion` setting, disabling transform/layout animations
 * across the app. The global CSS guard in `globals.css` covers CSS motion.
 *
 * Lists, tables and charts do not animate in: they are data loaded many times
 * a day, and entrance motion there only delays what the user came to read.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
