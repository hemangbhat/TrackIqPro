"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MarketingShell from "../../components/MarketingShell";
import ScoreWaterfall from "../../components/landing/ScoreWaterfall";
import WhatIfDesk from "../../components/landing/WhatIfDesk";
import { CheckIcon, XIcon } from "../../components/ui/icons";
import { FREE_JOB_LIMIT } from "../../lib/plans";
import { demoJobs } from "../../lib/demo-data";
import type { Job } from "../../types";

/* ------------------------------- Content ------------------------------- */

// The six pure scoring engines in lib/, each unit- and property-tested.
const engines: { name: string; question: string; shows: string }[] = [
    {
        name: "Job Fit",
        question: "How well does this role fit me?",
        shows: "A 0–100 score from your skills, target title and seniority, with what helped, what held it back, and what to learn next.",
    },
    {
        name: "Offer Intelligence",
        question: "Which offer should I take?",
        shows: "Six dimensions normalized across your real offers, weighted by you, with why #1 leads and a path to #1 for every runner-up.",
    },
    {
        name: "Offer Score",
        question: "How do two offers compare, side by side?",
        shows: "A weighted comparison of salary, equity, growth and brand for a quick read on any pair.",
    },
    {
        name: "Career Health",
        question: "Is my search actually working?",
        shows: "One grade from five weighted pipeline metrics, plus the single next action that moves it most.",
    },
    {
        name: "Follow-up Priority",
        question: "Who should I chase today?",
        shows: "Stale applications ranked by stage value and urgency, also sent as a daily email digest you can turn off.",
    },
    {
        name: "Interview Reflection",
        question: "What do my interviews keep saying?",
        shows: "Strengths, weak spots and a confidence trend, read from your own round-by-round notes.",
    },
];

const stages: { key: Job["stage"]; label: string }[] = [
    { key: "applied", label: "Applied" },
    { key: "screening", label: "Screening" },
    { key: "interview", label: "Interview" },
    { key: "offer", label: "Offer" },
    { key: "accepted", label: "Accepted" },
    { key: "rejected", label: "Rejected" },
    { key: "withdrawn", label: "Withdrawn" },
];

const stageCounts = stages.reduce(
    (acc, s) => {
        acc[s.key] = demoJobs.filter((j) => j.stage === s.key).length;
        return acc;
    },
    {} as Record<Job["stage"], number>
);

const tracker: { title: string; body: string }[] = [
    {
        title: "Every application, one list",
        body: "Company, stage, salary and links for each role, with search, filter and sort. No spreadsheet upkeep.",
    },
    {
        title: "Notes by interview round",
        body: "Private notes attached to the application and the round they belong to, so prep starts where you left off.",
    },
    {
        title: "AI prep, only if you turn it on",
        body: "Likely questions and a study plan built from the job description and your notes. Every item cites its source. Off by default, 5 preps a day.",
    },
];

const pricingPreview: { label: string; free: boolean | string; pro: boolean | string }[] = [
    { label: "Application tracking", free: `Up to ${FREE_JOB_LIMIT}`, pro: "Unlimited" },
    { label: "Interview notes", free: true, pro: true },
    { label: "All six scoring engines", free: true, pro: true },
    { label: "CSV export", free: false, pro: true },
];

const production: { title: string; body: string }[] = [
    {
        title: "Your search stays private",
        body: "Your applications, notes and offers are tied to your account. No one else can read them.",
    },
    {
        title: "Same inputs, same score",
        body: "No randomness and no hidden model. Change one fact and you can see exactly what moved.",
    },
    {
        title: "You only pay when you choose",
        body: "Pro starts after Stripe confirms your payment, and you can cancel anytime.",
    },
];

/* ------------------------------ Helpers ------------------------------ */

function PreviewCell({ value, label, onField }: { value: boolean | string; label: string; onField?: boolean }) {
    if (typeof value === "string") return <span className="font-semibold">{value}</span>;
    return value ? (
        <span className="inline-flex">
            <CheckIcon size={20} aria-hidden="true" />
            <span className="sr-only">{label}: included</span>
        </span>
    ) : (
        <span className={`inline-flex ${onField ? "text-[var(--on-ultra-muted)]" : "text-[var(--ink-muted)]"}`}>
            <XIcon size={20} aria-hidden="true" />
            <span className="sr-only">{label}: not included</span>
        </span>
    );
}

const container = "mx-auto w-full max-w-[90rem] px-4 sm:px-8 lg:px-12";

/* ------------------------------- Page -------------------------------- */

export default function Home() {
    const router = useRouter();
    const [navError, setNavError] = useState<string | null>(null);

    // Navigate with failure handling: if navigation cannot be completed,
    // remain on the landing route and surface an error message (Req 5.7).
    const navigate = useCallback(
        (href: string) => {
            setNavError(null);
            try {
                router.push(href);
            } catch {
                setNavError("We couldn't open that page. Please try again in a moment.");
            }
        },
        [router]
    );

    return (
        <MarketingShell>
            {navError && (
                <div className={`${container} pt-4`}>
                    <div
                        role="alert"
                        className="flex items-center gap-3 border-2 border-[var(--ink)] px-4 py-3 text-sm font-semibold"
                    >
                        <XIcon size={18} className="shrink-0" aria-hidden />
                        <span>{navError}</span>
                    </div>
                </div>
            )}

            {/* ------------------------------ Hero ------------------------------ */}
            <section className={`${container} pb-16 pt-8 sm:pt-10 lg:pb-24`}>
                <h1 className="gw-display text-[clamp(3.1rem,9.2vw,9rem)]">
                    Every score shows its work.
                </h1>
                <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-6">
                    <p className="max-w-[36rem] text-lg leading-relaxed text-[var(--ink-muted)] sm:text-xl lg:col-span-6">
                        Track applications, keep private interview notes, and compare offers with
                        six scoring engines that break every number into what helped and what
                        held it back.
                    </p>
                    <div className="lg:col-span-5 lg:col-start-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <button
                                type="button"
                                className="gw-btn gw-btn-primary"
                                onClick={() => navigate("/sign-up")}
                            >
                                Get started free
                            </button>
                            <Link href="/demo" className="gw-btn gw-btn-secondary">
                                Open the live demo
                            </Link>
                        </div>
                        <p className="mt-4 text-sm text-[var(--ink-muted)]">
                            Free for up to {FREE_JOB_LIMIT} applications. No card required. The demo
                            needs no sign-up.
                        </p>
                    </div>
                </div>

                <div className="mt-12 lg:mt-9">
                    <ScoreWaterfall />
                </div>
            </section>

            {/* ---------------------------- What-if ----------------------------- */}
            <section id="what-if" className="scroll-mt-20 border-t-2 border-[var(--ink)]">
                <div className={`${container} py-20 lg:py-28`}>
                    <div className="grid gap-6 lg:grid-cols-12">
                        <h2 className="gw-display text-[clamp(2.5rem,5vw,4.75rem)] lg:col-span-7">
                            Change what matters. Watch the ranking answer.
                        </h2>
                        <p className="max-w-[34rem] text-lg leading-relaxed text-[var(--ink-muted)] lg:col-span-4 lg:col-start-9 lg:self-end">
                            Three sample offers, scored on six dimensions and normalized against each
                            other. Move a weight and the engine re-ranks them, then says why #1 leads
                            and what would put each runner-up on top.
                        </p>
                    </div>
                    <div className="mt-14">
                        <WhatIfDesk />
                    </div>
                </div>
            </section>

            {/* ---------------------------- Engines ----------------------------- */}
            <section id="engines" className="scroll-mt-20 bg-[var(--ink)] text-[var(--paper)]">
                <div className={`${container} py-20 lg:py-28`}>
                    <h2 className="gw-display max-w-[14ch] text-[clamp(2.5rem,5vw,4.75rem)]">
                        Six engines. No black box.
                    </h2>
                    <p className="mt-6 max-w-[38rem] text-lg leading-relaxed opacity-75">
                        Each one is a pure, tested function over your own data. None of them ever
                        hands you a bare number.
                    </p>
                    <dl className="mt-14 border-t-2 border-current">
                        {engines.map((e) => (
                            <div
                                key={e.name}
                                className="grid gap-x-6 gap-y-2 border-b border-current/25 py-6 md:grid-cols-12"
                            >
                                <dt className="text-2xl font-extrabold tracking-[-0.02em] md:col-span-4 lg:text-[1.75rem]">
                                    {e.name}
                                </dt>
                                <dd className="text-lg font-semibold md:col-span-3">{e.question}</dd>
                                <dd className="leading-relaxed opacity-75 md:col-span-5">{e.shows}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* ---------------------------- Tracker ----------------------------- */}
            <section id="tracker" className="scroll-mt-20">
                <div className={`${container} py-20 lg:py-28`}>
                    <div className="grid gap-6 lg:grid-cols-12">
                        <h2 className="gw-display text-[clamp(2.5rem,5vw,4.75rem)] lg:col-span-7">
                            Underneath it, the tracker you need.
                        </h2>
                    </div>
                    <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[var(--ink-muted)]">
                        Seven stages, from applied to a decision. Here is the sample pipeline the
                        demo runs on.
                    </p>
                    <ol
                        aria-label="Sample applications by stage"
                        className="mt-10 flex border-t-2 border-[var(--ink)]"
                    >
                        {stages
                            .filter((s) => stageCounts[s.key] > 0)
                            .map((s) => {
                                const closed = s.key === "rejected" || s.key === "withdrawn";
                                return (
                                    <li
                                        key={s.key}
                                        className="min-w-0 pr-1.5"
                                        style={{ flexGrow: stageCounts[s.key], flexBasis: 0 }}
                                    >
                                        <span
                                            aria-hidden
                                            className={`mt-3 block h-10 ${closed ? "gw-hatch text-[var(--ink)]" : "bg-[var(--ink)]"}`}
                                        />
                                        <span className="gw-num mt-3 block text-[clamp(1.75rem,3vw,2.75rem)] leading-none">
                                            {stageCounts[s.key]}
                                        </span>
                                        <span className="mt-1 block truncate text-sm font-semibold sm:text-[0.9375rem]">
                                            {s.label}
                                        </span>
                                    </li>
                                );
                            })}
                    </ol>
                    {stages.some((s) => stageCounts[s.key] === 0) && (
                        <p className="mt-4 text-sm text-[var(--ink-muted)]">
                            None yet:{" "}
                            {stages
                                .filter((s) => stageCounts[s.key] === 0)
                                .map((s) => s.label)
                                .join(", ")}
                            . Stages that ended without an offer are hatched.
                        </p>
                    )}
                    <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
                        {tracker.map((t) => (
                            <div key={t.title} className="border-t-2 border-[var(--ink)] pt-4">
                                <h3 className="text-xl font-bold tracking-[-0.01em]">{t.title}</h3>
                                <p className="mt-2 max-w-[30rem] leading-relaxed text-[var(--ink-muted)]">{t.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* -------------------------- Pricing preview ------------------------ */}
            <section className="border-t-2 border-[var(--ink)]">
                <div className={`${container} grid gap-12 py-20 lg:grid-cols-12 lg:gap-6 lg:py-28`}>
                    <div className="lg:col-span-5">
                        <h2 className="gw-display text-[clamp(2.5rem,5vw,4.75rem)]">
                            Free until your search outgrows it.
                        </h2>
                        <p className="mt-6 max-w-[30rem] text-lg leading-relaxed text-[var(--ink-muted)]">
                            Every engine works on the Free plan. Pro removes the application limit
                            and adds export.
                        </p>
                        <button
                            type="button"
                            className="gw-btn gw-btn-secondary mt-8"
                            onClick={() => navigate("/pricing")}
                        >
                            See full pricing
                        </button>
                    </div>

                    <table className="w-full border-collapse text-left lg:col-span-6 lg:col-start-7">
                        <caption className="sr-only">What the Free and Pro plans include</caption>
                        <thead>
                            <tr className="border-b-2 border-[var(--ink)]">
                                <th scope="col" className="py-4 pr-4 text-sm font-semibold text-[var(--ink-muted)]">
                                    <span className="sr-only">Feature</span>
                                </th>
                                <th scope="col" className="w-[28%] px-4 py-4 text-xl font-bold">
                                    Free
                                </th>
                                <th
                                    scope="col"
                                    className="w-[28%] bg-[var(--ultra)] px-4 py-4 text-xl font-bold text-[var(--on-ultra)]"
                                >
                                    Pro
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {pricingPreview.map((r) => (
                                <tr key={r.label} className="border-b border-[var(--hair)]">
                                    <th scope="row" className="py-4 pr-4 font-semibold">
                                        {r.label}
                                    </th>
                                    <td className="px-4 py-4">
                                        <PreviewCell value={r.free} label={r.label} />
                                    </td>
                                    <td className="bg-[var(--ultra)] px-4 py-4 text-[var(--on-ultra)]">
                                        <PreviewCell value={r.pro} label={r.label} onField />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ------------------------- Built for real -------------------------- */}
            <section className="border-t-2 border-[var(--ink)]">
                <div className={`${container} grid gap-10 py-20 lg:grid-cols-12 lg:gap-6`}>
                    <h2 className="text-[clamp(1.75rem,2.6vw,2.5rem)] font-extrabold leading-tight tracking-[-0.03em] lg:col-span-4">
                        Built to be trusted with your search
                    </h2>
                    <div className="grid gap-8 sm:grid-cols-3 sm:gap-6 lg:col-span-8">
                        {production.map((p) => (
                            <div key={p.title}>
                                <h3 className="text-lg font-bold">{p.title}</h3>
                                <p className="mt-2 leading-relaxed text-[var(--ink-muted)]">{p.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --------------------------- Closing CTA --------------------------- */}
            <section className="bg-[var(--ultra)] text-[var(--on-ultra)]">
                <div className={`${container} grid gap-10 py-20 lg:grid-cols-12 lg:gap-6 lg:py-28`}>
                    <h2 className="gw-display text-[clamp(2.75rem,6.4vw,6.5rem)] lg:col-span-8">
                        Your next decision deserves reasons.
                    </h2>
                    <div className="lg:col-span-4 lg:self-end">
                        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                            <button
                                type="button"
                                className="gw-btn gw-btn-inverse"
                                onClick={() => navigate("/sign-up")}
                            >
                                Get started free
                            </button>
                            <button
                                type="button"
                                className="gw-btn gw-btn-outline-inverse"
                                onClick={() => navigate("/demo")}
                            >
                                Try the live demo
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-[var(--on-ultra-muted)]">
                            No credit card required for the Free plan.
                        </p>
                    </div>
                </div>
            </section>
        </MarketingShell>
    );
}
