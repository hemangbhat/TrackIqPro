"use client";

import React from "react";
import Link from "next/link";
import MarketingShell from "../../../components/MarketingShell";
import StatCard from "../../../components/StatCard";
import ApplicationsChart from "../../../components/ApplicationsChart";
import StatusBreakdown from "../../../components/StatusBreakdown";
import { CareerHealthCard } from "../../../components/intelligence/CareerHealthCard";
import { PriorityQueue } from "../../../components/intelligence/PriorityQueue";
import { ReflectionPanel } from "../../../components/intelligence/ReflectionPanel";
import { JobFitList } from "../../../components/intelligence/JobFitList";
import { OfferIntelligence } from "../../../components/intelligence/OfferIntelligence";
import { Button } from "../../../components/ui/primitives";
import {
    SparklesIcon,
    ArrowRightIcon,
    BriefcaseIcon,
    TargetIcon,
    TrophyIcon,
    ActivityIcon,
    TrendingUpIcon,
    ScaleIcon,
} from "../../../components/ui/icons";

import {
    demoJobs,
    demoOffers,
    demoNotes,
    DEMO_PROFILE,
} from "../../../lib/demo-data";
import { computeCareerHealth } from "../../../lib/career-health";
import { getPriorityQueue } from "../../../lib/follow-up-intelligence";
import { analyzeReflections } from "../../../lib/interview-reflection";
import {
    getKpis,
    getStatusBreakdown,
    getApplicationsOverTime,
} from "../../../lib/insights";

/* ----------------------------- Section header ---------------------------- */

function SectionHeading({
    eyebrow,
    title,
    description,
    icon,
}: {
    eyebrow: string;
    title: string;
    description?: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                {icon}
            </span>
            <div>
                <p className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                    {eyebrow}
                </p>
                <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
                    {title}
                </h2>
                {description && (
                    <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

/* --------------------------------- Page ---------------------------------- */

export default function DemoPage() {
    // Presentation only — derive everything directly from the demo dataset.
    const kpis = getKpis(demoJobs);
    const health = computeCareerHealth(demoJobs);
    const priority = getPriorityQueue(demoJobs);
    const reflection = analyzeReflections(demoNotes);
    const applicationsOverTime = getApplicationsOverTime(demoJobs);
    const statusBreakdown = getStatusBreakdown(demoJobs);

    const kpiCards = [
        {
            label: "Applications",
            value: kpis.total,
            icon: <BriefcaseIcon size={18} />,
            tone: "indigo" as const,
            hint: "Total roles tracked",
        },
        {
            label: "Interview rate",
            value: `${kpis.interviewRate}%`,
            icon: <TargetIcon size={18} />,
            tone: "violet" as const,
            hint: "Reached interview or beyond",
        },
        {
            label: "Offers",
            value: kpis.offers,
            icon: <TrophyIcon size={18} />,
            tone: "emerald" as const,
            hint: "Offers + accepted",
        },
        {
            label: "Active",
            value: kpis.active,
            icon: <ActivityIcon size={18} />,
            tone: "amber" as const,
            hint: "Still in the pipeline",
        },
    ];

    return (
        <MarketingShell>
            <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                {/* ------------------------- Demo banner ------------------------- */}
                <div
                    role="region"
                    aria-label="Demo mode banner"
                    className="hero-gradient gradient-border relative overflow-hidden rounded-3xl border border-indigo-500/30 p-6 shadow-2xl sm:p-8"
                >
                    <div
                        aria-hidden
                        className="accent-orb pointer-events-none absolute right-0 top-[-30%] h-[300px] w-[420px]"
                    />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl">
                            <span className="font-mono-label inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-4 py-1.5 text-xs uppercase text-indigo-500 dark:text-indigo-300">
                                <SparklesIcon size={14} /> Live demo
                            </span>
                            <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
                                You&rsquo;re exploring TrackIQ with sample data
                            </h1>
                            <p className="mt-3 text-[var(--text-muted)]">
                                Everything below is powered by the same engines and components
                                that ship in the product — career health, job fit, follow-up
                                intelligence, analytics, and the interactive offer comparison.
                                No account needed.
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                            <Link href="/sign-up">
                                <Button size="md" className="w-full px-6 py-3 text-base">
                                    Create your free account <ArrowRightIcon size={18} />
                                </Button>
                            </Link>
                            <Link href="/">
                                <Button
                                    variant="secondary"
                                    size="md"
                                    className="w-full px-6 py-3 text-base"
                                >
                                    Back to home
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* --------------------------- KPI row --------------------------- */}
                <section aria-label="Key metrics" className="mt-10">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {kpiCards.map((c) => (
                            <StatCard
                                key={c.label}
                                label={c.label}
                                value={c.value}
                                icon={c.icon}
                                tone={c.tone}
                                hint={c.hint}
                            />
                        ))}
                    </div>
                </section>

                {/* ------------------- Career Health + Priority ------------------ */}
                <section aria-label="Career intelligence" className="mt-10">
                    <div className="grid items-start gap-6 lg:grid-cols-2">
                        <CareerHealthCard health={health} />
                        <PriorityQueue items={priority} />
                    </div>
                </section>

                {/* ----------------------- Top Opportunities --------------------- */}
                <section aria-label="Top opportunities" className="mt-12">
                    <SectionHeading
                        eyebrow="Job Fit"
                        title="Top opportunities"
                        description="Each active application scored against your skills, target role, and seniority — with a transparent breakdown of what helped and what held it back."
                        icon={<TargetIcon size={20} />}
                    />
                    <div className="mt-6">
                        <JobFitList jobs={demoJobs} profile={DEMO_PROFILE} />
                    </div>
                </section>

                {/* ---------------------------- Analytics ------------------------ */}
                <section aria-label="Analytics" className="mt-12">
                    <SectionHeading
                        eyebrow="Analytics"
                        title="Your pipeline at a glance"
                        description="Application trends and stage breakdown, derived live from your tracked roles."
                        icon={<TrendingUpIcon size={20} />}
                    />
                    <div className="mt-6 grid gap-6 lg:grid-cols-5">
                        <div className="surface glass-panel gradient-border rounded-2xl p-6 lg:col-span-3">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-display text-base font-semibold text-[var(--text)]">
                                    Applications over time
                                </h3>
                                <span className="font-mono-label text-[10px] uppercase text-[var(--text-muted)]">
                                    Last 8 weeks
                                </span>
                            </div>
                            <ApplicationsChart data={applicationsOverTime} />
                        </div>
                        <div className="surface glass-panel gradient-border rounded-2xl p-6 lg:col-span-2">
                            <h3 className="font-display mb-4 text-base font-semibold text-[var(--text)]">
                                Applications by stage
                            </h3>
                            <StatusBreakdown data={statusBreakdown} />
                        </div>
                    </div>
                </section>

                {/* ----------------------- Offer Intelligence -------------------- */}
                <section aria-label="Offer intelligence" className="mt-12">
                    <SectionHeading
                        eyebrow="Decision engine"
                        title="Offer Intelligence"
                        description="Weigh competing offers across six dimensions and run live what-if scenarios — the ranking responds instantly with the reasoning behind every result."
                        icon={<ScaleIcon size={20} />}
                    />
                    <div className="mt-6">
                        <OfferIntelligence offers={demoOffers} />
                    </div>
                </section>

                {/* ---------------------- Interview Reflection ------------------- */}
                <section aria-label="Interview reflection" className="mt-12">
                    <ReflectionPanel reflection={reflection} />
                </section>

                {/* ----------------------- Closing CTA --------------------------- */}
                <section className="mt-14">
                    <div className="cta-gradient relative overflow-hidden rounded-3xl border border-indigo-500/30 p-10 text-center shadow-2xl sm:p-14">
                        <div
                            aria-hidden
                            className="accent-orb pointer-events-none absolute left-1/2 top-0 h-[260px] w-[480px] -translate-x-1/2"
                        />
                        <div className="relative">
                            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                Ready to track your own search?
                            </h2>
                            <p className="mx-auto mt-3 max-w-xl text-indigo-100">
                                Bring your applications, notes, and offers into one intelligent
                                command center. It&rsquo;s free to get started.
                            </p>
                            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <Link href="/sign-up">
                                    <Button
                                        size="md"
                                        className="bg-white px-6 py-3 text-base text-indigo-700 hover:bg-indigo-50"
                                    >
                                        Create your free account <ArrowRightIcon size={18} />
                                    </Button>
                                </Link>
                                <Link href="/">
                                    <Button
                                        variant="ghost"
                                        size="md"
                                        className="px-6 py-3 text-base text-white hover:bg-white/10 hover:text-white"
                                    >
                                        Back to home
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </MarketingShell>
    );
}
