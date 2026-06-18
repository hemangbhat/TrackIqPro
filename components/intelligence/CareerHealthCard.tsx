"use client";
import React from "react";
import type { CareerHealthResult, HealthGrade } from "../../lib/career-health";
import { Card, Badge, EmptyState } from "../ui/primitives";
import { ActivityIcon } from "../ui/icons";
import { ScoreRing } from "./ScoreRing";

const GRADE_TONE: Record<HealthGrade, string> = {
    Excellent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    Good: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
    "Needs Improvement": "bg-amber-500/15 text-amber-600 dark:text-amber-300",
};

const RING_TONE: Record<HealthGrade, "emerald" | "indigo" | "amber"> = {
    Excellent: "emerald",
    Good: "indigo",
    "Needs Improvement": "amber",
};

const PRIORITY_TONE: Record<string, string> = {
    high: "border-rose-500/30 bg-rose-500/5",
    medium: "border-amber-500/30 bg-amber-500/5",
    low: "border-emerald-500/30 bg-emerald-500/5",
};

const PRIORITY_DOT: Record<string, string> = {
    high: "bg-rose-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
};

function MetricBar({
    label,
    score,
    weight,
    detail,
}: {
    label: string;
    score: number;
    weight: number;
    detail: string;
}) {
    const tone =
        score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-indigo-500" : score >= 30 ? "bg-amber-500" : "bg-rose-500";
    return (
        <div>
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-[var(--text)]">{label}</span>
                <span className="font-mono-label text-[11px] text-[var(--text-muted)]">
                    {score} · {Math.round(weight * 100)}% weight
                </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                    className={`h-full rounded-full ${tone}`}
                    style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                    role="progressbar"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${label} sub-score`}
                />
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
        </div>
    );
}

/**
 * Career Health overview: a score ring + grade badge, the five weighted metrics
 * as labeled progress bars, and priority-colored recommendations. Bento-friendly
 * — fills the height of its grid cell.
 */
export function CareerHealthCard({ health }: { health: CareerHealthResult }) {
    const empty = health.metrics.length === 0;

    return (
        <Card className="glass-panel gradient-border flex h-full flex-col p-6 sm:p-7">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                    <ActivityIcon size={20} />
                </span>
                <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--text)]">
                        Career Health
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                        A composite read on your pipeline.
                    </p>
                </div>
            </div>

            {empty ? (
                <div className="mt-6 flex-1">
                    <EmptyState
                        icon={<ActivityIcon size={22} />}
                        title="No applications yet"
                        description="Add a few applications to unlock your Career Health score and personalized guidance."
                    />
                </div>
            ) : (
                <>
                    <div className="mt-6 flex items-center gap-5">
                        <ScoreRing value={health.score} size={104} strokeWidth={9} tone={RING_TONE[health.grade]} sublabel="/ 100" />
                        <div>
                            <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${GRADE_TONE[health.grade]}`}
                            >
                                {health.grade}
                            </span>
                            <p className="mt-2 text-sm text-[var(--text-muted)]">{health.summary}</p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        {health.metrics.map((m) => (
                            <MetricBar
                                key={m.key}
                                label={m.label}
                                score={m.score}
                                weight={m.weight}
                                detail={m.detail}
                            />
                        ))}
                    </div>

                    {health.recommendations.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                Recommendations
                            </h3>
                            <ul className="mt-3 space-y-2.5">
                                {health.recommendations.map((r, i) => (
                                    <li
                                        key={`${r.title}-${i}`}
                                        className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${PRIORITY_TONE[r.priority] || PRIORITY_TONE.low}`}
                                    >
                                        <span
                                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[r.priority] || PRIORITY_DOT.low}`}
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text)]">
                                                {r.title}
                                                <Badge tone={r.priority === "high" ? "rejected" : r.priority === "medium" ? "pending" : "offer"} className="ml-2 align-middle">
                                                    {r.priority}
                                                </Badge>
                                            </p>
                                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{r.detail}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
