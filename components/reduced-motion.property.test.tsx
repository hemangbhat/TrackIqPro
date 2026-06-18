import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import React from "react";

/**
 * Property 7: Reduced motion (Validates: Requirements 14.5, 16.3)
 *
 * For any chart/animation surface, when `prefers-reduced-motion: reduce` is set
 * no non-essential animation runs — the Chart.js `animation` option resolves to
 * `false` (duration ~0) for both the doughnut (StatusBreakdown) and line
 * (ApplicationsChart) charts, for arbitrary data arrays.
 *
 * react-chartjs-2 renders to a <canvas> which jsdom cannot exercise, so we mock
 * the library and capture the `options.animation` value handed to each chart.
 */

// Module-level capture store. Keyed by the mock chart type so a single render of
// both charts can be inspected independently.
const captured: { doughnut: unknown[]; line: unknown[] } = {
  doughnut: [],
  line: [],
};

vi.mock("react-chartjs-2", () => {
  const makeChart = (key: "doughnut" | "line") =>
    function MockChart(props: { options?: { animation?: unknown } }) {
      captured[key].push(props.options?.animation);
      return React.createElement("div", { "data-testid": `mock-${key}` });
    };
  return {
    Doughnut: makeChart("doughnut"),
    Line: makeChart("line"),
  };
});

import { renderWithTheme, cleanup } from "../test/render";
import StatusBreakdown from "./StatusBreakdown";
import ApplicationsChart from "./ApplicationsChart";

function resetCapture() {
  captured.doughnut = [];
  captured.line = [];
}

// Arbitrary data for the two chart surfaces.
const STAGES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

const statusDataArb = fc.array(
  fc.record({
    stage: fc.constantFrom(...STAGES),
    count: fc.nat({ max: 500 }),
  }),
  { maxLength: 12 }
);

const timeDataArb = fc.array(
  fc.record({
    // Simple, stable date-like labels.
    date: fc
      .integer({ min: 1, max: 28 })
      .map((d) => `2024-01-${String(d).padStart(2, "0")}`),
    count: fc.nat({ max: 500 }),
  }),
  { maxLength: 12 }
);

describe("Property 7: reduced motion disables chart animation", () => {
  beforeEach(() => {
    resetCapture();
  });

  it("animation resolves to false for both charts when reduced motion is set", () => {
    fc.assert(
      fc.property(statusDataArb, timeDataArb, (statusData, timeData) => {
        resetCapture();

        renderWithTheme(<StatusBreakdown data={statusData} />, {
          reducedMotion: true,
        });
        renderWithTheme(<ApplicationsChart data={timeData} />, {
          reducedMotion: true,
        });

        try {
          // Both charts must have been rendered with animation === false.
          expect(captured.doughnut.length).toBeGreaterThan(0);
          expect(captured.line.length).toBeGreaterThan(0);
          for (const animation of captured.doughnut) {
            expect(animation).toBe(false);
          }
          for (const animation of captured.line) {
            expect(animation).toBe(false);
          }
        } finally {
          cleanup();
        }
        return true;
      })
    );
  });

  it("does not force-disable animation when reduced motion is not set", () => {
    fc.assert(
      fc.property(statusDataArb, timeDataArb, (statusData, timeData) => {
        resetCapture();

        renderWithTheme(<StatusBreakdown data={statusData} />, {
          reducedMotion: false,
        });
        renderWithTheme(<ApplicationsChart data={timeData} />, {
          reducedMotion: false,
        });

        try {
          expect(captured.doughnut.length).toBeGreaterThan(0);
          expect(captured.line.length).toBeGreaterThan(0);
          // Animation must NOT be force-disabled (i.e. not `false`); the chart
          // falls back to Chart.js defaults (resolved here as `undefined`).
          for (const animation of captured.doughnut) {
            expect(animation).not.toBe(false);
          }
          for (const animation of captured.line) {
            expect(animation).not.toBe(false);
          }
        } finally {
          cleanup();
        }
        return true;
      })
    );
  });
});
