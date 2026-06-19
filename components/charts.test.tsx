import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

/**
 * Unit tests for theme-aware charts (Task 5.4).
 *
 * Validates:
 *  - Requirement 14.1: tick / grid / axis / label colors switch when the active
 *    theme changes.
 *  - Requirement 14.3: every chart is paired with a programmatically associated
 *    text summary (role="img" + aria-describedby -> sr-only element stating data
 *    values and trend).
 *  - Requirement 14.4: every series is distinguished by a non-color attribute (a
 *    direct legend label and/or a shape point marker), in addition to color.
 *
 * react-chartjs-2 renders to a <canvas> that jsdom cannot exercise, so we mock
 * the library and capture the `data` and `options` objects handed to each chart.
 * The chart color resolver (`lib/theme-tokens`) reads `getComputedStyle` of CSS
 * variables; jsdom does not load `globals.css`, so we apply the active theme's
 * design-token values inline on `documentElement` before each render. The
 * resolver then returns the real token values for the active theme (light
 * `--text-muted` #475569 vs dark #94a3b8), which is what theme switching does in
 * the running app.
 */

// ---------------------------------------------------------------------------
// Mock react-chartjs-2: capture the props passed to each chart kind.
// ---------------------------------------------------------------------------
interface ChartDataset {
  label: string;
  borderColor: string;
  pointStyle?: string;
  pointRadius?: number;
}
interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}
interface ChartOptions {
  scales: {
    x: { ticks: { color: string }; border: { color: string } };
    y: { ticks: { color: string }; grid: { color: string } };
  };
  plugins: {
    legend: {
      display: boolean;
      labels: { color: string; usePointStyle: boolean; pointStyle: string };
    };
  };
}
type Captured = { data: ChartData; options: ChartOptions };

const captured: { doughnut: Captured[]; line: Captured[] } = {
  doughnut: [],
  line: [],
};

vi.mock("react-chartjs-2", () => {
  const makeChart = (key: "doughnut" | "line") =>
    function MockChart(props: { data?: unknown; options?: unknown }) {
      captured[key].push({
        data: props.data as ChartData,
        options: props.options as ChartOptions,
      });
      return React.createElement("div", { "data-testid": `mock-${key}` });
    };
  return {
    Doughnut: makeChart("doughnut"),
    Line: makeChart("line"),
  };
});

import { renderWithTheme, cleanup, screen, type ThemeChoice } from "../test/render";
import StatusBreakdown from "./StatusBreakdown";
import ApplicationsChart from "./ApplicationsChart";
import {
  LIGHT_TOKENS,
  DARK_TOKENS,
  withAlpha,
  type ThemeToken,
} from "../lib/theme-tokens";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function resetCapture() {
  captured.doughnut = [];
  captured.line = [];
}

/**
 * Make the active theme's design tokens resolvable via getComputedStyle by
 * setting them inline on documentElement (jsdom doesn't load globals.css).
 */
function applyTokensInline(theme: ThemeChoice) {
  const tokens = theme === "dark" ? DARK_TOKENS : LIGHT_TOKENS;
  const root = document.documentElement;
  for (const [token, value] of Object.entries(tokens)) {
    root.style.setProperty(token, value);
  }
}

function clearTokensInline() {
  const root = document.documentElement;
  for (const token of Object.keys(LIGHT_TOKENS) as ThemeToken[]) {
    root.style.removeProperty(token);
  }
}

const STATUS_DATA = [
  { stage: "applied", count: 3 },
  { stage: "interview", count: 1 },
  { stage: "offer", count: 2 },
];

const TIME_DATA = [
  { date: "2024-01-01", count: 2 },
  { date: "2024-01-08", count: 4 },
  { date: "2024-01-15", count: 5 },
];

/** Render one chart in a given theme and return the captured chart props. */
function captureLine(theme: ThemeChoice): Captured {
  resetCapture();
  applyTokensInline(theme);
  renderWithTheme(<ApplicationsChart data={TIME_DATA} />, { theme });
  const result = captured.line[0];
  cleanup();
  return result;
}

function captureDoughnut(theme: ThemeChoice): Captured {
  resetCapture();
  applyTokensInline(theme);
  renderWithTheme(<StatusBreakdown data={STATUS_DATA} />, { theme });
  const result = captured.doughnut[0];
  cleanup();
  return result;
}

beforeEach(() => {
  resetCapture();
  clearTokensInline();
});

// ---------------------------------------------------------------------------
// Requirement 14.1 — tick / grid / axis / label colors switch on theme change
// ---------------------------------------------------------------------------
describe("Requirement 14.1: chart colors switch when the theme changes", () => {
  it("ApplicationsChart tick, grid, and axis colors differ between light and dark", () => {
    const light = captureLine("light");
    const dark = captureLine("dark");

    // Axis tick colors use the muted-text token, which differs by theme.
    expect(light.options.scales.x.ticks.color).toBe(LIGHT_TOKENS["--text-muted"]);
    expect(light.options.scales.y.ticks.color).toBe(LIGHT_TOKENS["--text-muted"]);
    expect(dark.options.scales.x.ticks.color).toBe(DARK_TOKENS["--text-muted"]);
    expect(dark.options.scales.y.ticks.color).toBe(DARK_TOKENS["--text-muted"]);
    expect(light.options.scales.x.ticks.color).not.toBe(
      dark.options.scales.x.ticks.color
    );

    // Grid + axis-border lines are the muted token at reduced alpha.
    expect(light.options.scales.y.grid.color).toBe(
      withAlpha(LIGHT_TOKENS["--text-muted"], 0.7)
    );
    expect(dark.options.scales.y.grid.color).toBe(
      withAlpha(DARK_TOKENS["--text-muted"], 0.7)
    );
    expect(light.options.scales.y.grid.color).not.toBe(
      dark.options.scales.y.grid.color
    );

    expect(light.options.scales.x.border.color).not.toBe(
      dark.options.scales.x.border.color
    );
  });

  it("ApplicationsChart legend label color differs between light and dark", () => {
    const light = captureLine("light");
    const dark = captureLine("dark");

    expect(light.options.plugins.legend.labels.color).toBe(
      LIGHT_TOKENS["--text-muted"]
    );
    expect(dark.options.plugins.legend.labels.color).toBe(
      DARK_TOKENS["--text-muted"]
    );
    expect(light.options.plugins.legend.labels.color).not.toBe(
      dark.options.plugins.legend.labels.color
    );
  });

  it("ApplicationsChart primary series accent color differs between light and dark", () => {
    const light = captureLine("light");
    const dark = captureLine("dark");

    expect(light.data.datasets[0].borderColor).toBe(LIGHT_TOKENS["--accent"]);
    expect(dark.data.datasets[0].borderColor).toBe(DARK_TOKENS["--accent"]);
    expect(light.data.datasets[0].borderColor).not.toBe(
      dark.data.datasets[0].borderColor
    );
  });

  it("StatusBreakdown legend label color switches between light and dark", () => {
    const light = captureDoughnut("light");
    const dark = captureDoughnut("dark");

    expect(light.options.plugins.legend.labels.color).toBe(
      LIGHT_TOKENS["--text-muted"]
    );
    expect(dark.options.plugins.legend.labels.color).toBe(
      DARK_TOKENS["--text-muted"]
    );
    expect(light.options.plugins.legend.labels.color).not.toBe(
      dark.options.plugins.legend.labels.color
    );

    // Doughnut arcs are separated by the surface token, which also switches.
    expect(light.data.datasets[0].borderColor).toBe(LIGHT_TOKENS["--surface"]);
    expect(dark.data.datasets[0].borderColor).toBe(DARK_TOKENS["--surface"]);
  });
});

// ---------------------------------------------------------------------------
// Requirement 14.3 — programmatically associated, assistive-tech text summary
// ---------------------------------------------------------------------------
describe("Requirement 14.3: each chart has an associated text summary", () => {
  it("ApplicationsChart exposes an sr-only summary with values and trend via aria-describedby", () => {
    applyTokensInline("light");
    renderWithTheme(<ApplicationsChart data={TIME_DATA} />, { theme: "light" });

    const region = screen.getByRole("img", { name: "Applications over time" });
    const summaryId = region.getAttribute("aria-describedby");
    expect(summaryId).toBeTruthy();

    const summary = document.getElementById(summaryId as string);
    expect(summary).not.toBeNull();
    expect(summary).toHaveClass("sr-only");

    const text = summary!.textContent ?? "";
    // States the data values...
    expect(text).toContain("2024-01-01: 2");
    expect(text).toContain("2024-01-15: 5");
    // ...and the overall trend (rising, since last 5 > first 2).
    expect(text.toLowerCase()).toContain("trend");
    expect(text).toContain("rising");
  });

  it("StatusBreakdown exposes an sr-only summary with values and dominant stage via aria-describedby", () => {
    applyTokensInline("light");
    renderWithTheme(<StatusBreakdown data={STATUS_DATA} />, { theme: "light" });

    const region = screen.getByRole("img", { name: "Applications by stage" });
    const summaryId = region.getAttribute("aria-describedby");
    expect(summaryId).toBeTruthy();

    const summary = document.getElementById(summaryId as string);
    expect(summary).not.toBeNull();
    expect(summary).toHaveClass("sr-only");

    const text = summary!.textContent ?? "";
    // States the per-stage data values...
    expect(text).toContain("Applied: 3");
    expect(text).toContain("Interview: 1");
    expect(text).toContain("Offer: 2");
    // ...and the dominant stage as the distribution's "trend".
    expect(text).toContain("stage");
    expect(text).toContain("Applied"); // 3 is the largest count
  });
});

// ---------------------------------------------------------------------------
// Requirement 14.4 — series distinguished by a non-color attribute
// ---------------------------------------------------------------------------
describe("Requirement 14.4: series distinguished by a non-color attribute", () => {
  it("ApplicationsChart labels the series and uses a shape point marker, with the legend shown", () => {
    const { data, options } = captureLine("light");

    // Direct, human-readable series label (not color).
    expect(data.datasets[0].label).toBe("Applications");
    // Shape marker distinguishes the series independent of color.
    expect(data.datasets[0].pointStyle).toBe("circle");
    expect(data.datasets[0].pointRadius).toBeGreaterThan(0);
    // The legend (carrying the direct label) is visible.
    expect(options.plugins.legend.display).toBe(true);
    expect(options.plugins.legend.labels.usePointStyle).toBe(true);
  });

  it("StatusBreakdown provides a direct label per segment and point-style legend markers", () => {
    const { data, options } = captureDoughnut("light");

    // Every segment has a direct text label, so segments are not color-only.
    expect(data.labels).toHaveLength(STATUS_DATA.length);
    for (const label of data.labels as string[]) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
    expect(data.labels).toContain("Applied");
    expect(data.labels).toContain("Interview");

    // Dataset carries a descriptive label and the legend uses shape markers.
    expect(data.datasets[0].label).toBe("Applications by stage");
    expect(options.plugins.legend.labels.usePointStyle).toBe(true);
    expect(options.plugins.legend.labels.pointStyle).toBe("circle");
  });
});
