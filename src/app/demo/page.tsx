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
import PrepPanel from "../../../components/PrepPanel";
import { ButtonLink } from "../../../components/ui/primitives";
import {
    BriefcaseIcon,
    TargetIcon,
    TrophyIcon,
    ActivityIcon,
} from "../../../components/ui/icons";

import {
    demoJobs,
    demoOffers,
    demoNotes,
    DEMO_PROFILE,
} from "../../../lib/demo-data";
import { DEMO_PREP_SAMPLE } from "../../../lib/demo-prep-sample";
import { computeCareerHealth } from "../../../lib/career-health";
import { getPriorityQueue } from "../../../lib/follow-up-intelligence";
import { analyzeReflections } from "../../../lib/interview-reflection";
import {
    getKpis,
    getStatusBreakdown,
    getApplicationsOverTime,
} from "../../../lib/insights";

/* ----------------------------- Section header ---------------------------- */

function SectionHeading({ title, description }: { title: string; description?: string }) {
    return (
        <div>
            <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-tight tracking-[-0.03em] text-[var(--ink)]">
                {title}
            </h2>
            {description && (
                <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--ink-muted)]">
                    {description}
                </p>
            )}
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
            <div className="mx-auto w-full max-w-[90rem] px-4 pb-16 pt-10 sm:px-8 sm:pt-12 lg:px-12">
                {/* ------------------------- Demo banner ------------------------- */}
                <div
                    role="region"
                    aria-label="Demo mode banner"
                    className="grid gap-8 border-b-2 border-[var(--ink)] pb-10 lg:grid-cols-12 lg:gap-6"
                >
                    <div className="lg:col-span-8">
                        <h1 className="gw-display max-w-[18ch] text-[clamp(2.5rem,5vw,4.75rem)]">
                            You&rsquo;re exploring TrackIQ with sample data
                        </h1>
                        <p className="mt-6 max-w-[40rem] text-lg leading-relaxed text-[var(--ink-muted)]">
                            Everything below is powered by the same engines and components
                            that ship in the product — career health, job fit, follow-up
                            intelligence, analytics, and the interactive offer comparison.
                            No account needed.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:flex-col lg:self-end">
                        <Link href="/sign-up" className="gw-btn gw-btn-primary">
                            Create your free account
                        </Link>
                        <Link href="/" className="gw-btn gw-btn-secondary">
                            Back to home
                        </Link>
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
                        <PriorityQueue items={priority} linkToJobs={false} />
                    </div>
                </section>

                {/* ----------------------- Top Opportunities --------------------- */}
                <section aria-label="Top opportunities" className="mt-12">
                    <SectionHeading
                        title="Top opportunities"
                        description="Each active application scored against your skills, target role, and seniority — with a transparent breakdown of what helped and what held it back."
                    />
                    <div className="mt-6">
                        <JobFitList jobs={demoJobs} profile={DEMO_PROFILE} />
                    </div>
                </section>

                {/* ---------------------------- Analytics ------------------------ */}
                <section aria-label="Analytics" className="mt-12">
                    <SectionHeading
                        title="Your pipeline at a glance"
                        description="Application trends and stage breakdown, derived live from your tracked roles."
                    />
                    <div className="mt-6 grid gap-6 lg:grid-cols-5">
                        <div className="surface glass-panel gradient-border rounded-2xl p-6 lg:col-span-3">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-display text-base font-semibold text-[var(--text)]">
                                    Applications over time
                                </h3>
                                <span className="font-bold text-sm text-[var(--text-muted)]">
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
                        title="Offer Intelligence"
                        description="Weigh competing offers across six dimensions and run live what-if scenarios — the ranking responds instantly with the reasoning behind every result."
                    />
                    <div className="mt-6">
                        <OfferIntelligence offers={demoOffers} />
                    </div>
                </section>

                {/* ---------------------- Interview Reflection ------------------- */}
                <section aria-label="Interview reflection" className="mt-12">
                    <ReflectionPanel reflection={reflection} />
                </section>

                {/* ------------------------ Interview prep ------------------------ */}
                <section aria-label="Interview prep" className="mt-12">
                    <SectionHeading
                        title="Interview prep from your own notes"
                        description="Likely questions, weak spots, and a study plan, each traced back to the notes and job descriptions it came from."
                    />
                    <div className="mt-6">
                        <PrepPanel sample={DEMO_PREP_SAMPLE} />
                    </div>
                </section>

                {/* ----------------------- Closing CTA --------------------------- */}
                <section className="mt-14">
                    <div className="cta-gradient relative overflow-hidden rounded-3xl border border-indigo-500/30 p-10 text-center shadow-2xl sm:p-14">
                        <div className="relative">
                            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                Ready to track your own search?
                            </h2>
                            <p className="mx-auto mt-3 max-w-xl text-indigo-100">
                                Bring your applications, notes, and offers into one intelligent
                                command center. It&rsquo;s free to get started.
                            </p>
                            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <ButtonLink
                                    href="/sign-up"
                                    size="md"
                                    className="bg-white px-6 py-3 text-base text-indigo-700 hover:bg-indigo-50"
                                >
                                    Create your free account
                                </ButtonLink>
                                <ButtonLink
                                    href="/"
                                    variant="ghost"
                                    size="md"
                                    className="px-6 py-3 text-base text-white hover:bg-white/10 hover:text-white"
                                >
                                    Back to home
                                </ButtonLink>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </MarketingShell>
    );
}
