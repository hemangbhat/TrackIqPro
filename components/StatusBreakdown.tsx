"use client";

import { useId } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { withAlpha } from "../lib/theme-tokens";
import { useChartTheme } from "./useChartTheme";
import { useReducedMotion } from "./useReducedMotion";
import { summarizeStatusBreakdown } from "./chartSummary";

type StatusBreakdownProps = {
  data: { stage: string; count: number }[];
  /**
   * Optional accessible label for the chart region. Falls back to a generic
   * label. Exposed to assistive tech via the chart's `aria-label`.
   */
  title?: string;
  /**
   * Optional override for the programmatically-associated text summary. When
   * omitted, a summary is derived from `data` (Requirement 14.3).
   */
  summary?: string;
};

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Status-tone palette (matches the design's Badge tones):
 * applied=blue, screening=amber, interview=violet, offer/accepted=emerald,
 * pending=amber, rejected=rose, withdrawn=slate. These are vivid brand tones
 * that read in both themes; each segment is additionally labeled in the legend
 * so the data is not conveyed by color alone (Requirement 14.4).
 */
const STATUS_TONES: Record<string, string> = {
  applied: "#3b82f6",
  screening: "#f59e0b",
  interview: "#8b5cf6",
  offer: "#10b981",
  accepted: "#10b981",
  pending: "#f59e0b",
  rejected: "#f43f5e",
  withdrawn: "#64748b",
};

function toneFor(stage: string): string {
  return STATUS_TONES[stage.toLowerCase()] ?? "#64748b";
}

export default function StatusBreakdown({ data, title, summary }: StatusBreakdownProps) {
  // Colors are re-derived from the active theme and update within 500ms of a
  // theme change (Requirement 14.1).
  const theme = useChartTheme();
  // When reduced motion is requested, the chart renders directly in its final
  // state with animation disabled for both initial render and updates
  // (Requirement 14.5).
  const reducedMotion = useReducedMotion();
  const summaryId = useId();

  const summaryText = summary ?? summarizeStatusBreakdown(data);
  const label = title ?? "Applications by stage";

  const chartData = {
    labels: data.map((d) => d.stage.charAt(0).toUpperCase() + d.stage.slice(1)),
    datasets: [
      {
        label: "Applications by stage",
        data: data.map((d) => d.count),
        backgroundColor: data.map((d) => withAlpha(toneFor(d.stage), 0.85)),
        // Separate arcs against the active surface in both themes.
        borderColor: theme.surface,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // `false` disables animation for the initial render and every data update.
    animation: reducedMotion ? (false as const) : undefined,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          // Direct labels per segment (non-color attribute) at AA contrast.
          color: theme.textMuted,
          padding: 15,
          usePointStyle: true,
          pointStyle: "circle" as const,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: withAlpha(theme.text, 0.92),
        titleColor: theme.surface,
        bodyColor: theme.surface,
        padding: 12,
      },
    },
  };

  return (
    <div
      role="img"
      aria-label={label}
      aria-describedby={summaryId}
      style={{ height: "300px" }}
      className="flex items-center justify-center"
    >
      <p id={summaryId} className="sr-only">
        {summaryText}
      </p>
      <Doughnut data={chartData} options={options} aria-hidden="true" />
    </div>
  );
}
