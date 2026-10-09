"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import MarketingShell from "../../components/MarketingShell";
import { Button } from "../../components/ui/primitives";
import {
    BriefcaseIcon,
    NotesIcon,
    ScaleIcon,
    TrendingUpIcon,
    ArrowRightIcon,
    SparklesIcon,
    PlusIcon,
    SearchIcon,
    TrophyIcon,
    CheckIcon,
    XIcon,
    TargetIcon,
    ActivityIcon,
    ClockIcon,
    BrainIcon,
    ShieldIcon,
    SlidersIcon,
    CreditCardIcon,
} from "../../components/ui/icons";
import HeroPreview, {
    heroJobFit,
    heroOfferRanking,
    heroTopJob,
} from "../../components/landing/HeroPreview";
import { FREE_JOB_LIMIT } from "../../lib/plans";
import { useReducedMotion } from "../../components/useReducedMotion";
import { revealPreset, staggerItemPreset } from "../../components/motion";

/* ------------------------------- Content ------------------------------- */

const steps = [
    {
        icon: <PlusIcon size={18} />,
        title: "Add your applications",
        body: "Log roles in seconds with company, stage, salary, and links — no spreadsheet wrangling.",
    },
    {
        icon: <SearchIcon size={18} />,
        title: "Track and take notes",
        body: "Move applications through stages and keep private interview notes attached to each one.",
    },
    {
        icon: <TrophyIcon size={18} />,
        title: "Compare and decide",
        body: "Weigh offers across salary, equity, growth, and brand to see your clear best fit.",
    },
];

// Honest, verifiable engineering facts — no invented logos or testimonials.
const proofPoints = [
    { icon: <BrainIcon size={18} />, value: "6", label: "explainable scoring engines" },
    { icon: <ShieldIcon size={18} />, value: "100%", label: "server-derived, user-isolated data" },
    { icon: <CheckIcon size={18} />, value: "250+", label: "automated + property-based tests" },
    { icon: <CreditCardIcon size={18} />, value: "Webhook", label: "verified Stripe plan changes" },
];

const intelligence = [
    {
        icon: <TargetIcon size={20} />,
        title: "Job Fit Score",
        body: "Scores each role against your skills, target title, and seniority — with what helped and what hurt.",
    },
    {
        icon: <SlidersIcon size={20} />,
        title: "What-if simulator",
        body: "Re-weight six offer dimensions and watch the ranking re-order live, with the reason for every move.",
    },
    {
        icon: <ActivityIcon size={20} />,
        title: "Career Health",
        body: "One grade from five weighted pipeline metrics, plus the single next action that moves it most.",
    },
    {
        icon: <ClockIcon size={20} />,
        title: "Follow-up queue",
        body: "Stale applications ranked by value, so the follow-ups most likely to pay off come first.",
    },
];

const pricingPreview: { label: string; free: boolean | string; pro: boolean | string }[] = [
    { label: "Application tracking", free: `Up to ${FREE_JOB_LIMIT}`, pro: "Unlimited" },
    { label: "Interview notes", free: true, pro: true },
    { label: "Offer comparison engine", free: true, pro: true },
    { label: "CSV export", free: false, pro: true },
];

/* ------------------------------ Helpers ------------------------------ */

function PreviewCell({ value }: { value: boolean | string }) {
    if (typeof value === "string")
        return <span className="text-sm text-[var(--text)]">{value}</span>;
    return value ? (
        <CheckIcon size={18} className="text-emerald-500" aria-label="Included" />
    ) : (
        <XIcon size={18} className="text-[var(--text-muted)]/50" aria-label="Not included" />
    );
}

/* ------------------------------- Page -------------------------------- */

export default function Home() {
    const router = useRouter();
    const [navError, setNavError] = useState<string | null>(null);
    const reduced = useReducedMotion();
    const hero = revealPreset(reduced);

    // Navigate with failure handling: if navigation cannot be completed,
    // remain on the landing route and surface an error message (Req 5.7).
    const navigate = useCallback(
        (href: string) => {
            setNavError(null);
            try {
                router.push(href);
            } catch {
                setNavError(
                    "We couldn't open that page. Please try again in a moment."
                );
            }
        },
        [router]
    );

    return (
        <MarketingShell>
            {navError && (
                <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
                    <div
                        role="alert"
                        className="flex items-center gap-3 rounded-lg border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-300"
                    >
                        <XIcon size={18} className="shrink-0" />
                        <span>{navError}</span>
                    </div>
                </div>
            )}

            {/* ------------------------------ Hero ------------------------------ */}
            <section className="hero-gradient relative overflow-hidden">
                <div aria-hidden className="dot-grid pointer-events-none absolute inset-0" />
                <div
                    aria-hidden
                    className="accent-orb pointer-events-none absolute right-[-10%] top-[-20%] h-[520px] w-[720px]"
                />
                <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-16 sm:pt-20 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pb-32 lg:pt-24">
                    <motion.div
                        className="lg:col-span-5"
                        initial={hero.initial}
                        animate={hero.animate}
                        transition={hero.transition}
                    >
                        <Link
                            href="/demo"
                            className="group inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/70 py-1 pl-1 pr-3 text-xs text-[var(--text-muted)] transition-colors duration-200 hover:border-indigo-500/40 hover:text-[var(--text)]"
                        >
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                                Live
                            </span>
                            Every score explains itself
                            <ArrowRightIcon size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                        </Link>
                        <h1 className="font-display mt-6 text-[2.6rem] font-bold leading-[1.02] tracking-[-0.035em] text-[var(--text)] sm:text-6xl lg:text-[4.1rem]">
                            The command center for your{" "}
                            <span className="relative whitespace-nowrap text-indigo-600 dark:text-indigo-300">
                                job search
                                <svg
                                    aria-hidden
                                    viewBox="0 0 300 12"
                                    preserveAspectRatio="none"
                                    className="absolute -bottom-1.5 left-0 h-2.5 w-full text-indigo-500/40"
                                >
                                    <path d="M2 9 C 80 2, 220 2, 298 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                </svg>
                            </span>
                        </h1>
                        <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[var(--text-muted)]">
                            Track applications, keep private interview notes, and compare offers
                            with a weighted decision engine. Stop juggling spreadsheets and make
                            better career decisions.
                        </p>
                        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Button
                                size="md"
                                className="px-6 py-3 text-base"
                                onClick={() => navigate("/sign-up")}
                            >
                                Get started <ArrowRightIcon size={18} />
                            </Button>
                            <Button
                                variant="secondary"
                                size="md"
                                className="px-6 py-3 text-base"
                                onClick={() => navigate("/pricing")}
                            >
                                See pricing
                            </Button>
                        </div>
                        <Link
                            href="/demo"
                            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors duration-200 hover:text-indigo-500 dark:text-indigo-300"
                        >
                            Explore the demo <ArrowRightIcon size={16} />
                        </Link>
                        <p className="mt-8 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <CheckIcon size={14} className="text-emerald-500" />
                            Free for up to {FREE_JOB_LIMIT} applications. No card required.
                        </p>
                    </motion.div>

                    <motion.div
                        className="relative lg:col-span-7 lg:-mr-10 xl:-mr-20"
                        initial={revealPreset(reduced, 0.1).initial}
                        animate={revealPreset(reduced, 0.1).animate}
                        transition={revealPreset(reduced, 0.1).transition}
                    >
                        <HeroPreview />
                    </motion.div>
                </div>
            </section>

            {/* --------------------------- Proof strip -------------------------- */}
            <section className="border-y border-[var(--border)] bg-[var(--surface-2)]/30">
                <div className="mx-auto max-w-6xl px-6 py-10">
                    <p className="font-mono-label text-center text-xs uppercase tracking-widest text-[var(--text-muted)]">
                        Built like production software
                    </p>
                    <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
                        {proofPoints.map((p) => (
                            <div key={p.label} className="flex flex-col items-center text-center">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                                    {p.icon}
                                </span>
                                <dt className="sr-only">{p.label}</dt>
                                <dd className="mt-3">
                                    <span className="font-display tabular block text-2xl font-bold tracking-tight text-[var(--text)]">
                                        {p.value}
                                    </span>
                                    <span className="mt-1 block text-sm text-[var(--text-muted)]">
                                        {p.label}
                                    </span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* --------------------------- Feature grid -------------------------- */}
            <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
                <div className="max-w-2xl">
                    <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
                        Everything your search needs
                    </h2>
                    <p className="mt-3 text-[var(--text-muted)]">
                        One workspace for tracking, notes, and the offer decision that matters most.
                    </p>
                </div>

                <div className="mt-14 grid gap-6 md:grid-cols-12">
                    {/* Application tracker — large card */}
                    <motion.div
                        className="md:col-span-8"
                        initial={staggerItemPreset(reduced, 0).initial}
                        whileInView={staggerItemPreset(reduced, 0).animate}
                        viewport={{ once: true }}
                        transition={staggerItemPreset(reduced, 0).transition}
                    >
                        <div className="glass-panel gradient-border group flex h-full flex-col justify-between overflow-hidden rounded-2xl p-8">
                            <div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                                    <BriefcaseIcon size={24} />
                                </div>
                                <h3 className="font-display mt-6 text-2xl font-semibold text-[var(--text)]">
                                    Application tracker
                                </h3>
                                <p className="mt-3 max-w-md text-[var(--text-muted)]">
                                    Capture every role with stage tracking, salary, and fast search,
                                    filter, and sort. No more manual spreadsheet upkeep.
                                </p>
                            </div>
                            <div className="mt-8 flex flex-wrap gap-2">
                                {["Applied", "Screening", "Interview", "Offer"].map((s) => (
                                    <span
                                        key={s}
                                        className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-muted)]"
                                    >
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Interview notes — highlighted indigo card */}
                    <motion.div
                        className="md:col-span-4"
                        initial={staggerItemPreset(reduced, 1).initial}
                        whileInView={staggerItemPreset(reduced, 1).animate}
                        viewport={{ once: true }}
                        transition={staggerItemPreset(reduced, 1).transition}
                    >
                        <div className="flex h-full flex-col justify-between rounded-2xl bg-indigo-600 p-8 text-white shadow-xl shadow-indigo-600/20">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
                                <NotesIcon size={24} />
                            </div>
                            <div className="mt-6">
                                <h3 className="font-display text-2xl font-semibold">
                                    Interview notes
                                </h3>
                                <p className="mt-3 text-sm text-indigo-100">
                                    Private, round-by-round notes linked to each application so
                                    nothing slips through the cracks.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Offer decision engine */}
                    <motion.div
                        className="md:col-span-5"
                        initial={staggerItemPreset(reduced, 2).initial}
                        whileInView={staggerItemPreset(reduced, 2).animate}
                        viewport={{ once: true }}
                        transition={staggerItemPreset(reduced, 2).transition}
                    >
                        <div className="glass-panel gradient-border h-full rounded-2xl p-8">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                                <ScaleIcon size={24} />
                            </div>
                            <h3 className="font-display mt-6 text-2xl font-semibold text-[var(--text)]">
                                Offer decision engine
                            </h3>
                            <p className="mt-3 text-[var(--text-muted)]">
                                Compare offers with a weighted, normalized score and a clear
                                best-fit recommendation.
                            </p>
                        </div>
                    </motion.div>

                    {/* Analytics dashboard */}
                    <motion.div
                        className="md:col-span-7"
                        initial={staggerItemPreset(reduced, 3).initial}
                        whileInView={staggerItemPreset(reduced, 3).animate}
                        viewport={{ once: true }}
                        transition={staggerItemPreset(reduced, 3).transition}
                    >
                        <div className="glass-panel gradient-border flex h-full items-center justify-between gap-8 rounded-2xl p-8">
                            <div className="flex-1">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                                    <TrendingUpIcon size={24} />
                                </div>
                                <h3 className="font-display mt-6 text-2xl font-semibold text-[var(--text)]">
                                    Analytics dashboard
                                </h3>
                                <p className="mt-3 text-[var(--text-muted)]">
                                    Conversion rates, stage breakdowns, and application trends at a
                                    glance.
                                </p>
                            </div>
                            <div className="hidden h-28 items-end gap-2 sm:flex">
                                {[50, 72, 44, 86, 64].map((h, i) => (
                                    <div
                                        key={i}
                                        className="w-4 rounded-t-md bg-gradient-to-t from-indigo-500/30 to-indigo-500"
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Career Intelligence layer */}
                <div className="mt-20">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                                <SparklesIcon size={14} /> Career intelligence
                            </span>
                            <h3 className="font-display mt-2 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
                                Not just a tracker — a second opinion
                            </h3>
                            <p className="mt-2 max-w-xl text-[var(--text-muted)]">
                                Deterministic, explainable engines turn your pipeline into
                                decisions. No black box: every score ships its reasoning.
                            </p>
                        </div>
                        <Link
                            href="/demo"
                            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors duration-200 hover:text-indigo-500 dark:text-indigo-300"
                        >
                            See it on sample data <ArrowRightIcon size={16} />
                        </Link>
                    </div>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {intelligence.map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial={staggerItemPreset(reduced, i).initial}
                                whileInView={staggerItemPreset(reduced, i).animate}
                                viewport={{ once: true }}
                                transition={staggerItemPreset(reduced, i).transition}
                                className="glass-panel gradient-border group rounded-2xl p-6 transition-colors duration-200 hover:border-indigo-500/40"
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-500 dark:text-indigo-300">
                                    {f.icon}
                                </span>
                                <h4 className="font-display mt-5 text-lg font-semibold text-[var(--text)]">
                                    {f.title}
                                </h4>
                                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                                    {f.body}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --------------------------- How it works -------------------------- */}
            <section
                id="how-it-works"
                className="scroll-mt-20 border-y border-[var(--border)] bg-[var(--surface-2)]/40"
            >
                <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-12 lg:gap-16">
                    <div className="lg:col-span-5">
                        <div className="lg:sticky lg:top-28">
                            <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
                                How it works
                            </h2>
                            <p className="mt-3 max-w-sm text-[var(--text-muted)]">
                                From scattered applications to a confident decision in three steps.
                            </p>
                        </div>
                    </div>
                    <ol className="relative space-y-4 lg:col-span-7">
                        {steps.map((s, i) => (
                            <motion.li
                                key={s.title}
                                className="group relative flex gap-5 rounded-2xl border border-transparent p-5 transition-colors duration-200 hover:border-[var(--border)] hover:bg-[var(--surface)]"
                                initial={staggerItemPreset(reduced, i).initial}
                                whileInView={staggerItemPreset(reduced, i).animate}
                                viewport={{ once: true }}
                                transition={staggerItemPreset(reduced, i).transition}
                            >
                                <span className="font-display tabular text-5xl font-bold leading-none tracking-tighter text-[var(--border)] transition-colors duration-200 group-hover:text-indigo-500/60">
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <div className="pt-1">
                                    <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-300">
                                        {s.icon}
                                        <span className="sr-only">Step {i + 1}</span>
                                    </div>
                                    <h3 className="font-display mt-2 text-xl font-semibold text-[var(--text)]">
                                        {s.title}
                                    </h3>
                                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
                                        {s.body}
                                    </p>
                                </div>
                            </motion.li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* -------------------------- Pricing preview ------------------------ */}
            <section className="mx-auto max-w-4xl px-6 py-24">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
                        Start free, upgrade when it counts
                    </h2>
                    <p className="mt-3 text-[var(--text-muted)]">
                        A quick look at what each plan includes.
                    </p>
                </div>

                <div className="glass-panel gradient-border mt-12 overflow-hidden rounded-3xl">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr] items-center gap-4 border-b border-[var(--border)] px-6 py-4">
                        <span className="text-sm font-semibold text-[var(--text-muted)]">
                            Features
                        </span>
                        <span className="text-center text-sm font-semibold text-[var(--text)]">
                            Free
                        </span>
                        <span className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                            Pro
                            <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-600 dark:text-indigo-300">
                                Recommended
                            </span>
                        </span>
                    </div>
                    {pricingPreview.map((r) => (
                        <div
                            key={r.label}
                            className="grid grid-cols-[1.5fr_1fr_1fr] items-center gap-4 border-b border-[var(--border)] px-6 py-3.5 last:border-b-0"
                        >
                            <span className="text-sm text-[var(--text-muted)]">{r.label}</span>
                            <span className="flex justify-center">
                                <PreviewCell value={r.free} />
                            </span>
                            <span className="flex justify-center">
                                <PreviewCell value={r.pro} />
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex justify-center">
                    <Button
                        variant="secondary"
                        size="md"
                        className="px-6 py-3 text-base"
                        onClick={() => navigate("/pricing")}
                    >
                        See full pricing <ArrowRightIcon size={18} />
                    </Button>
                </div>
            </section>

            {/* -------------------------- Explainability ------------------------- */}
            <section className="border-y border-[var(--border)] bg-[var(--surface-2)]/40">
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
                    <div>
                        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                            Transparent by design
                        </span>
                        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
                            Every score shows its work
                        </h2>
                        <p className="mt-4 text-[var(--text-muted)]">
                            A number you can&apos;t question is a number you can&apos;t trust. Each
                            TrackIQ score breaks down into signed, point-by-point contributions —
                            so you can see exactly why one role or offer ranks above another, and
                            what would change it.
                        </p>
                        <ul className="mt-6 space-y-3 text-sm text-[var(--text)]">
                            {[
                                "Pure, unit-tested scoring functions — same input, same answer",
                                "Weights you control, normalized across your real offers",
                                "A concrete “path to #1” for every runner-up",
                            ].map((t) => (
                                <li key={t} className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                                        <CheckIcon size={12} />
                                    </span>
                                    {t}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <figure className="glass-panel gradient-border rounded-3xl p-6 sm:p-8">
                        <figcaption className="font-mono-label flex items-center justify-between text-[10px] uppercase text-[var(--text-muted)]">
                            <span>Job fit · {heroTopJob.company}</span>
                            <span>Sample data</span>
                        </figcaption>
                        <div className="mt-4 flex items-baseline gap-3">
                            <span className="font-display tabular text-5xl font-bold tracking-tight text-[var(--text)]">
                                {heroJobFit.score}
                            </span>
                            <span className="text-sm text-[var(--text-muted)]">/ 100 · {heroTopJob.title}</span>
                        </div>
                        {[
                            { title: "What helped", items: heroJobFit.whatHelped },
                            { title: "What held it back", items: heroJobFit.whatReduced },
                        ]
                            .filter((g) => g.items.length > 0)
                            .map((g) => (
                                <div key={g.title} className="mt-5">
                                    <div className="font-mono-label mb-2 text-[10px] uppercase text-[var(--text-muted)]">
                                        {g.title}
                                    </div>
                                    <ul className="space-y-2">
                                        {g.items.map((r) => (
                                            <li
                                                key={r.label}
                                                className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5"
                                            >
                                                <span className="text-sm text-[var(--text-muted)]">{r.label}</span>
                                                <span
                                                    className={`font-mono-label shrink-0 text-sm font-semibold ${
                                                        r.impact >= 0
                                                            ? "text-emerald-600 dark:text-emerald-300"
                                                            : "text-rose-600 dark:text-rose-300"
                                                    }`}
                                                >
                                                    {r.impact >= 0 ? "+" : "−"}
                                                    {Math.abs(r.impact)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        <div className="mt-6 rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4">
                            <div className="font-mono-label text-[10px] uppercase text-indigo-600 dark:text-indigo-300">
                                Offer engine · why #1
                            </div>
                            <p className="mt-1.5 text-sm text-[var(--text)]">
                                {heroOfferRanking.rationale.whyTop}
                            </p>
                        </div>
                    </figure>
                </div>
            </section>

            {/* --------------------------- Closing CTA --------------------------- */}
            <section className="mx-auto max-w-5xl px-6 py-24">
                <div className="cta-gradient relative overflow-hidden rounded-3xl border border-indigo-500/30 p-12 text-center shadow-2xl sm:p-16">
                    <div
                        aria-hidden
                        className="accent-orb pointer-events-none absolute left-1/2 top-0 h-[300px] w-[560px] -translate-x-1/2"
                    />
                    <div className="relative">
                        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Make your next career move with confidence
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-indigo-100">
                            Track every application, see why each role and offer scores the way
                            it does, and decide with evidence. Free to start.
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Button
                                variant="inverse"
                                size="md"
                                className="px-6 py-3 text-base"
                                onClick={() => navigate("/sign-up")}
                            >
                                Get started <ArrowRightIcon size={18} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="md"
                                className="px-6 py-3 text-base text-white hover:bg-white/10 hover:text-white"
                                onClick={() => navigate("/demo")}
                            >
                                Try the live demo
                            </Button>
                        </div>
                        <p className="mt-6 text-sm text-indigo-200/80">
                            No credit card required for the Free plan.
                        </p>
                    </div>
                </div>
            </section>
        </MarketingShell>
    );
}
