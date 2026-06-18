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
} from "../../components/ui/icons";
import { FREE_JOB_LIMIT } from "../../lib/plans";
import { useReducedMotion } from "../../components/useReducedMotion";
import { revealPreset, staggerItemPreset } from "../../components/motion";

/* ------------------------------- Content ------------------------------- */

const steps = [
    {
        icon: <PlusIcon />,
        title: "Add your applications",
        body: "Log roles in seconds with company, stage, salary, and links — no spreadsheet wrangling.",
    },
    {
        icon: <SearchIcon />,
        title: "Track and take notes",
        body: "Move applications through stages and keep private interview notes attached to each one.",
    },
    {
        icon: <TrophyIcon />,
        title: "Compare and decide",
        body: "Weigh offers across salary, equity, growth, and brand to see your clear best fit.",
    },
];

const institutions = ["Stanford", "MIT", "Harvard", "UC Berkeley", "Georgia Tech"];

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

/* Decorative SVG avatar for the testimonial (no emoji). */
function AvatarMark() {
    return (
        <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500"
        >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
        </span>
    );
}

/* Premium product-preview mockup (pure markup, no external image). */
function ProductPreview() {
    const bars = [40, 64, 52, 78, 60, 88, 72];
    return (
        <div className="glass-panel gradient-border overflow-hidden rounded-2xl p-3 shadow-2xl">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/60">
                {/* Window chrome */}
                <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
                    <span className="h-3 w-3 rounded-full bg-rose-400/70" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                    <span className="ml-3 inline-flex items-center gap-2 rounded-md bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                        <TrendingUpIcon size={13} /> TrackIQ dashboard
                    </span>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-3">
                    {/* Stat tiles */}
                    {[
                        { label: "Active", value: "24", tone: "text-indigo-500" },
                        { label: "Interviews", value: "6", tone: "text-violet-500" },
                        { label: "Offers", value: "3", tone: "text-emerald-500" },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left"
                        >
                            <div className="font-mono-label text-[10px] uppercase text-[var(--text-muted)]">
                                {s.label}
                            </div>
                            <div className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.value}</div>
                        </div>
                    ))}
                </div>

                <div className="grid gap-4 px-4 pb-5 sm:grid-cols-5">
                    {/* Mini bar chart */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:col-span-3">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-[var(--text)]">
                                Applications
                            </span>
                            <span className="font-mono-label text-[10px] uppercase text-[var(--text-muted)]">
                                Last 7 weeks
                            </span>
                        </div>
                        <div className="flex h-28 items-end gap-2">
                            {bars.map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500/40 to-indigo-500"
                                    style={{ height: `${h}%` }}
                                />
                            ))}
                        </div>
                    </div>
                    {/* Pipeline list */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:col-span-2">
                        <span className="text-sm font-semibold text-[var(--text)]">Pipeline</span>
                        <ul className="mt-3 space-y-2.5">
                            {[
                                { c: "Vercel", s: "Interview", dot: "bg-violet-500" },
                                { c: "Linear", s: "Offer", dot: "bg-emerald-500" },
                                { c: "Stripe", s: "Applied", dot: "bg-blue-500" },
                            ].map((row) => (
                                <li key={row.c} className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text)]">{row.c}</span>
                                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                        <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                                        {row.s}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
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
                <div
                    aria-hidden
                    className="accent-orb pointer-events-none absolute left-1/2 top-[-10%] h-[440px] w-[760px] -translate-x-1/2"
                />
                <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center sm:pt-24">
                    <motion.div
                        initial={hero.initial}
                        animate={hero.animate}
                        transition={hero.transition}
                    >
                        <span className="font-mono-label inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-4 py-1.5 text-xs uppercase text-indigo-500 dark:text-indigo-300">
                            <SparklesIcon size={14} /> The intelligent job tracker
                        </span>
                        <h1 className="font-display mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight text-[var(--text)] sm:text-6xl">
                            The command center for your{" "}
                            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                                job search
                            </span>
                        </h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-muted)]">
                            Track applications, keep private interview notes, and compare offers
                            with a weighted decision engine. Stop juggling spreadsheets and make
                            better career decisions.
                        </p>
                        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
                        <div className="mt-5 flex justify-center">
                            <Link
                                href="/demo"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors duration-200 hover:text-indigo-500 dark:text-indigo-300"
                            >
                                Explore the demo <ArrowRightIcon size={16} />
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        className="relative mx-auto mt-16 max-w-5xl"
                        initial={revealPreset(reduced, 0.1).initial}
                        animate={revealPreset(reduced, 0.1).animate}
                        transition={revealPreset(reduced, 0.1).transition}
                    >
                        <ProductPreview />
                    </motion.div>
                </div>
            </section>

            {/* --------------------------- Trust wall --------------------------- */}
            <section className="border-y border-[var(--border)]">
                <div className="mx-auto max-w-6xl px-6 py-12">
                    <p className="font-mono-label text-center text-xs uppercase tracking-widest text-[var(--text-muted)]">
                        Trusted by students at leading institutions
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                        {institutions.map((name) => (
                            <span
                                key={name}
                                className="font-display text-lg font-bold text-[var(--text-muted)]/70 transition-colors duration-300 hover:text-[var(--text)]"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* --------------------------- Feature grid -------------------------- */}
            <section id="features" className="mx-auto max-w-6xl px-6 py-24">
                <div className="mx-auto max-w-2xl text-center">
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
            </section>

            {/* --------------------------- How it works -------------------------- */}
            <section
                id="how-it-works"
                className="border-y border-[var(--border)] bg-[var(--surface-2)]/40"
            >
                <div className="mx-auto max-w-6xl px-6 py-24">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
                            How it works
                        </h2>
                        <p className="mt-3 text-[var(--text-muted)]">
                            From scattered applications to a confident decision in three steps.
                        </p>
                    </div>
                    <ol className="relative mt-16 grid gap-12 md:grid-cols-3">
                        {/* Connecting line */}
                        <div
                            aria-hidden
                            className="absolute left-0 top-7 hidden h-px w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent md:block"
                        />
                        {steps.map((s, i) => (
                            <motion.li
                                key={s.title}
                                className="relative z-10 text-center"
                                initial={staggerItemPreset(reduced, i).initial}
                                whileInView={staggerItemPreset(reduced, i).animate}
                                viewport={{ once: true }}
                                transition={staggerItemPreset(reduced, i).transition}
                            >
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-indigo-500 shadow-sm">
                                    {s.icon}
                                </div>
                                <div className="font-mono-label mt-4 text-xs uppercase text-indigo-500">
                                    Step {String(i + 1).padStart(2, "0")}
                                </div>
                                <h3 className="font-display mt-2 text-xl font-semibold text-[var(--text)]">
                                    {s.title}
                                </h3>
                                <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--text-muted)]">
                                    {s.body}
                                </p>
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

            {/* --------------------------- Social proof -------------------------- */}
            <section className="border-y border-[var(--border)] bg-[var(--surface-2)]/40">
                <div className="mx-auto max-w-3xl px-6 py-24">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
                            Loved by focused job seekers
                        </h2>
                    </div>
                    <div className="glass-panel gradient-border mt-12 rounded-3xl p-8 sm:p-10">
                        <figure>
                            <SparklesIcon size={22} className="text-indigo-500" />
                            <blockquote className="mt-4 text-xl leading-relaxed text-[var(--text)]">
                                &ldquo;TrackIQ turned my chaotic spreadsheet into a calm command
                                center. The offer comparison alone made my final decision
                                obvious.&rdquo;
                            </blockquote>
                            <figcaption className="mt-6 flex items-center gap-3">
                                <AvatarMark />
                                <div>
                                    <div className="text-sm font-semibold text-[var(--text)]">
                                        Maya Chen
                                    </div>
                                    <div className="text-sm text-[var(--text-muted)]">
                                        Software Engineer
                                    </div>
                                </div>
                            </figcaption>
                        </figure>
                    </div>
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
                            Join candidates who track, compare, and decide with clarity. It is free
                            to get started.
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Button
                                size="md"
                                className="bg-white px-6 py-3 text-base text-indigo-700 hover:bg-indigo-50"
                                onClick={() => navigate("/sign-up")}
                            >
                                Get started <ArrowRightIcon size={18} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="md"
                                className="px-6 py-3 text-base text-white hover:bg-white/10 hover:text-white"
                                onClick={() => navigate("/pricing")}
                            >
                                See pricing
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
