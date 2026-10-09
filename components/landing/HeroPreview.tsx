"use client";
import React from "react";
import { ScoreRing } from "../intelligence/ScoreRing";
import { CheckIcon, SparklesIcon, TrendingUpIcon } from "../ui/icons";
import { computeJobFit } from "../../lib/career-fit";
import { analyzeOffers } from "../../lib/offer-intelligence";
import { demoJobs, demoOffers, DEMO_PROFILE } from "../../lib/demo-data";

/*
 * Landing-page product preview. Every number here is produced by the real
 * engines (lib/career-fit, lib/offer-intelligence) running on the public demo
 * dataset — nothing is hardcoded. Only date-independent engines are used so
 * the prerendered HTML and the client render always agree.
 */

const topJob = demoJobs[0];
const jobFit = computeJobFit(topJob, DEMO_PROFILE);
const offerRanking = analyzeOffers(demoOffers);

const stageCounts = {
    active: demoJobs.filter((j) => j.status === "active").length,
    interviews: demoJobs.filter((j) => ["interview", "offer", "accepted"].includes(j.stage)).length,
    offers: demoOffers.length,
};

function Tile({ label, value, tone }: { label: string; value: number; tone: string }) {
    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left">
            <div className="font-mono-label text-[10px] uppercase text-[var(--text-muted)]">{label}</div>
            <div className={`font-display mt-1 text-2xl font-bold ${tone}`}>{value}</div>
        </div>
    );
}

function Reason({ label, impact }: { label: string; impact: number }) {
    const positive = impact >= 0;
    return (
        <li className="flex items-start gap-2.5 text-left">
            <span
                className={`font-mono-label mt-0.5 inline-flex min-w-[2.75rem] justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                    positive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-300"
                }`}
            >
                {positive ? "+" : "−"}
                {Math.abs(impact)}
            </span>
            <span className="text-xs leading-relaxed text-[var(--text-muted)]">{label}</span>
        </li>
    );
}

export default function HeroPreview() {
    const helped = jobFit.whatHelped.slice(0, 2);
    const heldBack = jobFit.whatReduced.slice(0, 1);

    return (
        <div className="glass-panel gradient-border overflow-hidden rounded-2xl p-2.5 shadow-2xl shadow-indigo-950/20 sm:p-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/70">
                {/* Window chrome */}
                <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
                    <span className="h-3 w-3 rounded-full bg-rose-400/70" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                    <span className="ml-3 inline-flex items-center gap-2 rounded-md bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                        <TrendingUpIcon size={13} /> trackiq.app/dashboard
                    </span>
                    <span className="font-mono-label ml-auto hidden items-center gap-1.5 text-[10px] uppercase text-emerald-600 dark:text-emerald-300 sm:inline-flex">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live engine output
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 sm:gap-4 sm:p-4">
                    <Tile label="Active" value={stageCounts.active} tone="text-indigo-500 dark:text-indigo-300" />
                    <Tile label="Interviews" value={stageCounts.interviews} tone="text-violet-500 dark:text-violet-300" />
                    <Tile label="Offers" value={stageCounts.offers} tone="text-emerald-500 dark:text-emerald-300" />
                </div>

                <div className="grid gap-3 px-3 pb-3 sm:gap-4 sm:px-4 sm:pb-4 md:grid-cols-5">
                    {/* Job fit — explainable score */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:col-span-3">
                        <div className="flex items-center justify-between gap-3">
                            <span className="font-mono-label text-[10px] uppercase text-[var(--text-muted)]">
                                Job fit
                            </span>
                            <span className="font-mono-label rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase text-indigo-600 dark:text-indigo-300">
                                {jobFit.confidence} confidence
                            </span>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                            <ScoreRing value={jobFit.score} size={76} strokeWidth={7} sublabel="fit" />
                            <div className="min-w-0 text-left">
                                <div className="truncate text-sm font-semibold text-[var(--text)]">
                                    {topJob.title}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">{topJob.company}</div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {jobFit.strongMatches.slice(0, 3).map((s) => (
                                        <span
                                            key={s}
                                            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300"
                                        >
                                            <CheckIcon size={10} /> {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 border-t border-[var(--border)] pt-3">
                            <div className="font-mono-label mb-2 text-left text-[10px] uppercase text-[var(--text-muted)]">
                                What helped
                            </div>
                            <ul className="space-y-2">
                                {helped.map((r) => (
                                    <Reason key={r.label} label={r.label} impact={r.impact} />
                                ))}
                            </ul>
                            {heldBack.length > 0 && (
                                <>
                                    <div className="font-mono-label mb-2 mt-3 text-left text-[10px] uppercase text-[var(--text-muted)]">
                                        Held it back
                                    </div>
                                    <ul className="space-y-2">
                                        {heldBack.map((r) => (
                                            <Reason key={r.label} label={r.label} impact={r.impact} />
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Offer ranking */}
                    <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:col-span-2">
                        <span className="font-mono-label text-left text-[10px] uppercase text-[var(--text-muted)]">
                            Offer ranking
                        </span>
                        <ol className="mt-3 space-y-3">
                            {offerRanking.offers.map((o) => (
                                <li key={o.id} className="text-left">
                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="flex items-center gap-2 font-medium text-[var(--text)]">
                                            <span className="font-mono-label text-[10px] text-[var(--text-muted)]">
                                                #{o.rank}
                                            </span>
                                            {o.offer.company}
                                        </span>
                                        <span
                                            className={`font-display text-sm font-bold ${
                                                o.isBest
                                                    ? "text-emerald-600 dark:text-emerald-300"
                                                    : "text-[var(--text-muted)]"
                                            }`}
                                        >
                                            {o.overall}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                                        <div
                                            className={`h-full rounded-full ${
                                                o.isBest
                                                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                                    : "bg-indigo-500/50"
                                            }`}
                                            style={{ width: `${Math.max(4, o.overall)}%` }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ol>
                        <p className="mt-auto flex items-start gap-1.5 border-t border-[var(--border)] pt-3 text-left text-[11px] leading-relaxed text-[var(--text-muted)]">
                            <SparklesIcon size={13} className="mt-0.5 shrink-0 text-indigo-500" />
                            <span className="line-clamp-3">{offerRanking.rationale.whyTop}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Exposed for the explainability section so both use identical engine output. */
export { jobFit as heroJobFit, offerRanking as heroOfferRanking, topJob as heroTopJob };
