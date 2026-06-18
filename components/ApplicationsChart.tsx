"use client";

import { useId } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { withAlpha } from "../lib/theme-tokens";
import { useChartTheme } from "./useChartTheme";
import { useReducedMotion } from "./useReducedMotion";
import { summarizeApplicationsOverTime } from "./chartSummary";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

type ApplicationsChartProps = {
    data: { date: string; count: number }[];
    /**
     * Optional accessible label for the chart region, exposed via `aria-label`.
     */
    title?: string;
    /**
     * Optional override for the programmatically-associated text summary. When
     * omitted, a summary is derived from `data` (Requirement 14.3).
     */
    summary?: string;
};

export default function ApplicationsChart({ data, title, summary }: ApplicationsChartProps) {
    // Tick/grid/axis/label colors and the indigo accent series are re-derived
    // from the active theme and update within 500ms of a theme change
    // (Requirements 14.1, 2.5). Light-theme tokens are used as a fallback.
    const theme = useChartTheme();
    const accent = theme.accent;
    // When reduced motion is requested, the chart renders directly in its final
    // state with animation disabled for both initial render and updates
    // (Requirement 14.5).
    const reducedMotion = useReducedMotion();
    const summaryId = useId();

    const summaryText = summary ?? summarizeApplicationsOverTime(data);
    const label = title ?? "Applications over time";

    const chartData = {
        labels: data.map((d) => d.date),
        datasets: [
            {
                // Direct series label + circular point markers distinguish the
                // series by non-color attributes (Requirement 14.4).
                label: "Applications",
                data: data.map((d) => d.count),
                borderColor: accent.line,
                backgroundColor: accent.fill,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointStyle: "circle" as const,
                pointBackgroundColor: accent.point,
                pointBorderColor: accent.point,
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
                // Show the series label so the series is identified without color.
                display: true,
                position: "top" as const,
                align: "end" as const,
                labels: {
                    color: theme.textMuted,
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
        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: theme.textMuted, stepSize: 1 },
                grid: { color: theme.grid },
                border: { color: theme.grid },
            },
            x: {
                ticks: { color: theme.textMuted },
                grid: { display: false },
                border: { color: theme.grid },
            },
        },
    };

    return (
        <div
            role="img"
            aria-label={label}
            aria-describedby={summaryId}
            style={{ height: "280px" }}
        >
            <p id={summaryId} className="sr-only">
                {summaryText}
            </p>
            <Line data={chartData} options={options} aria-hidden="true" />
        </div>
    );
}
