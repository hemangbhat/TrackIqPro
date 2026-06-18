"use client";
import React from "react";
import type { ReflectionResult, ReflectionInsight, ConfidencePoint } from "../../lib/interview-reflection";
import { Card, Badge, EmptyState } from "../ui/primitives";
import { BrainIcon, TrendingUpIcon } from "../ui/icons";

type TrendDir = ReflectionResult["trendDirection"];

const TREND_TONE: Record<TrendDir, string> = {
    improving: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    declining: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    steady: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
    insufficient: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

const TREND_LABEL: Record<TrendDir, string> = {
    improving: "Improving",
    declining: "Declining",
    steady: "Steady",
    insufficient: "Not enough data",
};

function ChipGroup({
    title,
    insights,
    tone,
}: {
    title: string;
    insights: ReflectionInsight[];
    tone: string;
}) {
    if (insights.length === 0) return null;
    return (
        <div>
            <h4 className="font-mono-label mb-2 text-[11px] uppercase text-[var(--text-muted)]">
                {title}
            </h4>
            <div className="flex flex-wrap gap-1.5">
                {insights.map((ins) => (
                    <span
                        key={ins.text}
                        title={ins.evidence.join(", ")}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
                    >
                        {ins.text}
                        {ins.count > 1 && (
                            <span className="font-mono-label text-[10px] opacity-70">×{ins.count}</span>
                        )}
                    </span>
                ))}
            </div>
        </div>
    );
}

/**
 * Inline SVG sparkline over the confidence trend. Confidence values are -1..1;
 * we map them into a fixed viewBox. Static (no animation) so it honors reduced
 * motion by construction.
 */
function ConfidenceSparkline({ points }: { points: ConfidencePoint[] }) {
    const W = 280;
    const H = 64;
    const pad = 6;

    if (points.length < 2) return null;

    const n = points.length;
    const toX = (i: number) => pad + (i / (n - 1)) * (W - pad * 2);
    // value -1..1 -> y (top is high confidence)
    const toY = (v: number) => pad + ((1 - v) / 2) * (H - pad * 2);

    const linePath = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
        .join(" ");
    const areaPath = `${linePath} L ${toX(n - 1).toFixed(1)} ${H - pad} L ${toX(0).toFixed(1)} ${H - pad} Z`;

    return (
        <svg
            width="100%"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="mt-3 h-16 w-full"
            role="img"
            aria-label={`Confidence trend across ${n} interview notes`}
        >
            {/* baseline (neutral confidence) */}
            <line
                x1={pad}
                x2={W - pad}
                y1={toY(0)}
                y2={toY(0)}
                className="stroke-[var(--border)]"
                strokeWidth="1"
                strokeDasharray="3 3"
            />
            <path d={areaPath} className="fill-indigo-500/10" />
            <path
                d={linePath}
                fill="none"
                className="stroke-indigo-500"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {points.map((p, i) => (
                <circle
                    key={i}
                    cx={toX(i)}
                    cy={toY(p.value)}
                    r="2.5"
                    className={
                        p.value > 0.15
                            ? "fill-emerald-500"
                            : p.value < -0.15
                              ? "fill-rose-500"
                              : "fill-indigo-500"
                    }
                />
            ))}
        </svg>
    );
}

/**
 * Interview Reflection: strengths / weaknesses / recurring mistakes / topics as
 * chip groups, a confidence-trend sparkline with a trend-direction badge, and a
 * plain-language summary. Bento-friendly.
 */
export function ReflectionPanel({ reflection }: { reflection: ReflectionResult }) {
    const hasInsights =
        reflection.strengths.length > 0 ||
        reflection.weaknesses.length > 0 ||
        reflection.recurringMistakes.length > 0 ||
        reflection.topicsToRevise.length > 0;

    return (
        <Card className="glass-panel gradient-border flex h-full flex-col p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                        <BrainIcon size={20} />
                    </span>
                    <div>
                        <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--text)]">
                            Interview Reflection
                        </h2>
                        <p className="text-sm text-[var(--text-muted)]">
                            Patterns across your interview notes.
                        </p>
                    </div>
                </div>
                <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TREND_TONE[reflection.trendDirection]}`}
                >
                    <TrendingUpIcon size={13} /> {TREND_LABEL[reflection.trendDirection]}
                </span>
            </div>

            {reflection.analyzed === 0 ? (
                <div className="mt-6 flex-1">
                    <EmptyState
                        icon={<BrainIcon size={22} />}
                        title="No interview notes yet"
                        description="Add interview notes to unlock reflection insights and a confidence trend over time."
                    />
                </div>
            ) : (
                <>
                    <p className="mt-5 text-sm text-[var(--text)]">{reflection.summary}</p>

                    {reflection.confidenceTrend.length >= 2 && (
                        <div>
                            <h4 className="font-mono-label mt-5 text-[11px] uppercase text-[var(--text-muted)]">
                                Confidence trend
                            </h4>
                            <ConfidenceSparkline points={reflection.confidenceTrend} />
                        </div>
                    )}

                    {hasInsights ? (
                        <div className="mt-5 space-y-4">
                            <ChipGroup
                                title="Strengths"
                                insights={reflection.strengths}
                                tone="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            />
                            <ChipGroup
                                title="Weaknesses"
                                insights={reflection.weaknesses}
                                tone="bg-amber-500/15 text-amber-600 dark:text-amber-300"
                            />
                            <ChipGroup
                                title="Recurring mistakes"
                                insights={reflection.recurringMistakes}
                                tone="bg-rose-500/15 text-rose-600 dark:text-rose-300"
                            />
                            <ChipGroup
                                title="Topics to revise"
                                insights={reflection.topicsToRevise}
                                tone="bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                            />
                        </div>
                    ) : (
                        <p className="mt-5 text-sm text-[var(--text-muted)]">
                            No clear patterns detected yet. Add more detailed interview notes to surface
                            strengths and areas to work on.
                        </p>
                    )}
                </>
            )}
        </Card>
    );
}
