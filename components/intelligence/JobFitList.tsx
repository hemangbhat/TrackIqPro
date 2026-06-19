"use client";
import React, { useMemo } from "react";
import type { Job } from "../../types";
import { computeJobFit, type JobFitResult } from "../../lib/career-fit";
import type { CareerProfileData } from "../../hooks/useCareerProfile";
import { Card, EmptyState } from "../ui/primitives";
import { TargetIcon, BookOpenIcon, SparklesIcon } from "../ui/icons";
import { ScoreRing } from "./ScoreRing";

const CONFIDENCE_TONE: Record<JobFitResult["confidence"], string> = {
    high: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    medium: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
    low: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
};

function Chips({
    items,
    tone,
}: {
    items: string[];
    tone: "emerald" | "amber";
}) {
    const cls =
        tone === "emerald"
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
            : "bg-amber-500/15 text-amber-600 dark:text-amber-300";
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((s) => (
                <span
                    key={s}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}
                >
                    {s}
                </span>
            ))}
        </div>
    );
}

function ReasonList({
    reasons,
    kind,
}: {
    reasons: { label: string; impact: number }[];
    kind: "helped" | "reduced";
}) {
    const positive = kind === "helped";
    const color = positive ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300";
    return (
        <ul className="space-y-1.5">
            {reasons.map((r, i) => (
                <li key={`${r.label}-${i}`} className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
                    <span className={`mt-px font-mono-label font-semibold tabular-nums ${color}`}>
                        {r.impact > 0 ? `+${r.impact}` : r.impact}
                    </span>
                    <span className="flex-1">{r.label}</span>
                </li>
            ))}
        </ul>
    );
}

function JobFitCard({ job, profile }: { job: Job; profile: CareerProfileData }) {
    const fit = useMemo(
        () =>
            computeJobFit(
                { title: job.title, jobDescription: job.jobDescription, notes: job.notes },
                profile
            ),
        [job, profile]
    );

    return (
        <Card className="surface gradient-border flex h-full flex-col p-5 sm:p-6">
            <div className="flex items-start gap-4">
                <ScoreRing value={fit.score} size={84} strokeWidth={8} sublabel="fit" />
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-base font-semibold tracking-tight text-[var(--text)]">
                            {job.title}
                        </h3>
                        <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${CONFIDENCE_TONE[fit.confidence]}`}
                        >
                            {fit.confidence} confidence
                        </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">{job.company}</p>
                    <p className="mt-2 text-sm text-[var(--text)]">{fit.summary}</p>
                </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {fit.strongMatches.length > 0 && (
                    <div>
                        <h4 className="font-mono-label mb-2 text-[11px] uppercase text-emerald-600 dark:text-emerald-300">
                            Strong matches
                        </h4>
                        <Chips items={fit.strongMatches} tone="emerald" />
                    </div>
                )}
                {fit.missingSkills.length > 0 && (
                    <div>
                        <h4 className="font-mono-label mb-2 text-[11px] uppercase text-amber-600 dark:text-amber-300">
                            Missing skills
                        </h4>
                        <Chips items={fit.missingSkills} tone="amber" />
                    </div>
                )}
            </div>

            {/* Explainability is mandatory — always render both reason columns. */}
            <div className="mt-5 grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:grid-cols-2">
                <div>
                    <h4 className="font-mono-label mb-2 text-[11px] uppercase text-emerald-600 dark:text-emerald-300">
                        What helped
                    </h4>
                    {fit.whatHelped.length > 0 ? (
                        <ReasonList reasons={fit.whatHelped} kind="helped" />
                    ) : (
                        <p className="text-xs text-[var(--text-muted)]">No positive factors detected yet.</p>
                    )}
                </div>
                <div>
                    <h4 className="font-mono-label mb-2 text-[11px] uppercase text-rose-600 dark:text-rose-300">
                        What reduced
                    </h4>
                    {fit.whatReduced.length > 0 ? (
                        <ReasonList reasons={fit.whatReduced} kind="reduced" />
                    ) : (
                        <p className="text-xs text-[var(--text-muted)]">Nothing notable held this back.</p>
                    )}
                </div>
            </div>

            {fit.suggestedLearning.length > 0 && (
                <div className="mt-4 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-300">
                        <BookOpenIcon size={16} />
                    </span>
                    <div>
                        <h4 className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                            Suggested learning
                        </h4>
                        <p className="mt-0.5 text-sm text-[var(--text)]">
                            {fit.suggestedLearning.join(" · ")}
                        </p>
                    </div>
                </div>
            )}
        </Card>
    );
}

/**
 * For every ACTIVE job, an explainable Job Fit card sorted by score descending.
 * When the profile has no skills, Job Fit cannot be judged, so we prompt the
 * user to add skills first instead of showing misleadingly low scores.
 */
export function JobFitList({
    jobs,
    profile,
    onAddSkills,
}: {
    jobs: Job[];
    profile: CareerProfileData;
    onAddSkills?: () => void;
}) {
    const activeJobs = useMemo(() => jobs.filter((j) => j.status === "active"), [jobs]);

    const ranked = useMemo(() => {
        return [...activeJobs]
            .map((job) => ({
                job,
                score: computeJobFit(
                    { title: job.title, jobDescription: job.jobDescription, notes: job.notes },
                    profile
                ).score,
            }))
            .sort((a, b) => b.score - a.score)
            .map((x) => x.job);
    }, [activeJobs, profile]);

    if (profile.skills.length === 0) {
        return (
            <EmptyState
                icon={<SparklesIcon size={22} />}
                title="Add your skills to unlock Job Fit"
                description="Job Fit compares each active application against your skills, target role, and seniority. Add a few skills to see explainable fit scores."
                action={
                    onAddSkills ? (
                        <button
                            type="button"
                            onClick={onAddSkills}
                            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                        >
                            <SparklesIcon size={16} /> Add skills
                        </button>
                    ) : undefined
                }
            />
        );
    }

    if (ranked.length === 0) {
        return (
            <EmptyState
                icon={<TargetIcon size={22} />}
                title="No active applications"
                description="Job Fit scores appear here for each of your active applications. Add an application to get started."
            />
        );
    }

    return (
        <div className="grid gap-5 lg:grid-cols-2">
            {ranked.map((job) => (
                <JobFitCard key={job._id} job={job} profile={profile} />
            ))}
        </div>
    );
}
