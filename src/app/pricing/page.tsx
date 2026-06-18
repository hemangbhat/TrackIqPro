"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import MarketingShell from "../../../components/MarketingShell";
import { Button } from "../../../components/ui/primitives";
import { useUserPlan } from "../../../components/useUserPlan";
import { useToast } from "../../../components/ui/Toast";
import { FREE_JOB_LIMIT, type Plan } from "../../../lib/plans";
import { useReducedMotion } from "../../../components/useReducedMotion";
import { revealPreset } from "../../../components/motion";
import {
    CheckIcon,
    XIcon,
    ArrowRightIcon,
    CreditCardIcon,
    SparklesIcon,
    ChevronDownIcon,
    LockIcon,
} from "../../../components/ui/icons";

// The Stripe flow must begin promptly (Requirements 12.2 / 12.3) and must not
// hang indefinitely: if nothing has completed within this window we surface an
// error and a retry CTA (Requirement 12.6).
const STRIPE_TIMEOUT_MS = 30_000;

type CtaKind = "upgrade" | "manage";

/* ----------------------------- Static data ----------------------------- */

const PLAN_FEATURES: { free: string[]; pro: string[] } = {
    free: [
        `Track up to ${FREE_JOB_LIMIT} active jobs`,
        "Private interview notes",
        "Offer comparison engine",
        "Analytics dashboard",
    ],
    pro: [
        "Unlimited job tracking",
        "Everything in Free",
        "CSV export",
        "Priority support",
    ],
};

type ComparisonRow = { label: string; free: boolean | string; pro: boolean | string };

const COMPARISON_ROWS: ComparisonRow[] = [
    { label: "Active job tracking", free: `Up to ${FREE_JOB_LIMIT}`, pro: "Unlimited" },
    { label: "Interview notes", free: true, pro: true },
    { label: "Offer comparison engine", free: true, pro: true },
    { label: "Analytics dashboard", free: true, pro: true },
    { label: "CSV export", free: false, pro: true },
    { label: "Priority support", free: false, pro: true },
];

const FAQS: { q: string; a: string }[] = [
    {
        q: "Can I cancel anytime?",
        a: "Yes. You can cancel your subscription at any time from the billing portal. You keep Pro access until the end of your current billing cycle.",
    },
    {
        q: "What happens to my data if I downgrade?",
        a: "Your applications, notes, and offers stay intact. If you exceed the Free plan limit you simply can't add new jobs until you're back under it.",
    },
    {
        q: "Is my payment information secure?",
        a: "Absolutely. Checkout and billing are handled entirely by Stripe. We never see or store your card details on our servers.",
    },
];

/* ------------------------------- Helpers -------------------------------- */

function ComparisonCell({ value, label }: { value: boolean | string; label: string }) {
    if (typeof value === "string") {
        return <span className="text-sm font-medium text-[var(--text)]">{value}</span>;
    }
    return value ? (
        <span className="inline-flex items-center justify-center text-emerald-500">
            <CheckIcon size={18} aria-hidden="true" />
            <span className="sr-only">{label}: included</span>
        </span>
    ) : (
        <span className="inline-flex items-center justify-center text-[var(--text-muted)]/50">
            <XIcon size={18} aria-hidden="true" />
            <span className="sr-only">{label}: not included</span>
        </span>
    );
}

function FaqAccordion() {
    const [open, setOpen] = useState<number | null>(0);
    return (
        <div className="mx-auto mt-12 max-w-3xl space-y-4">
            {FAQS.map((item, i) => {
                const expanded = open === i;
                const panelId = `faq-panel-${i}`;
                const buttonId = `faq-button-${i}`;
                return (
                    <div
                        key={item.q}
                        className="glass-panel gradient-border overflow-hidden rounded-2xl"
                    >
                        <h3>
                            <button
                                id={buttonId}
                                type="button"
                                aria-expanded={expanded}
                                aria-controls={panelId}
                                onClick={() => setOpen(expanded ? null : i)}
                                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                            >
                                <span className="font-display text-base font-semibold text-[var(--text)]">
                                    {item.q}
                                </span>
                                <ChevronDownIcon
                                    size={20}
                                    className={`shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${
                                        expanded ? "rotate-180" : ""
                                    }`}
                                />
                            </button>
                        </h3>
                        {expanded && (
                            <div
                                id={panelId}
                                role="region"
                                aria-labelledby={buttonId}
                                className="border-t border-[var(--border)] px-6 py-5 text-sm text-[var(--text-muted)]"
                            >
                                {item.a}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* -------------------------------- Page --------------------------------- */

export default function PricingPage() {
    const router = useRouter();
    const { isSignedIn } = useUser();
    const { plan, loading: planLoading } = useUserPlan();
    const toast = useToast();

    const [pending, setPending] = useState<CtaKind | null>(null);
    const [failed, setFailed] = useState<CtaKind | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reduced = useReducedMotion();
    const headerReveal = revealPreset(reduced);
    const cardsReveal = revealPreset(reduced, 0.1);

    // Plan data is only "available" once the hook resolves with a concrete plan.
    // Until then (or on failure) we present both CTAs with no current-plan
    // indicator (Requirement 12.7).
    const currentPlan: Plan | undefined =
        !planLoading && (plan === "free" || plan === "pro") ? plan : undefined;
    const planAvailable = currentPlan === "free" || currentPlan === "pro";
    const isFree = currentPlan === "free";
    const isPro = currentPlan === "pro";

    // Upgrade CTA — for Free users and when plan data is unavailable.
    // Manage-billing CTA — for Pro users and when plan data is unavailable.
    const showUpgrade = isFree || !planAvailable;
    const showManage = isPro || !planAvailable;

    const upgradeBusy = pending === "upgrade";
    const manageBusy = pending === "manage";
    const upgradeFailed = failed === "upgrade";
    const manageFailed = failed === "manage";

    const runStripeFlow = useCallback(
        async (kind: CtaKind, endpoint: string, failureMsg: string) => {
            // Signed-out visitors have no billing context — route them to sign-up
            // rather than calling the authenticated Stripe endpoints.
            if (!isSignedIn) {
                router.push("/sign-up");
                return;
            }

            setPending(kind);
            setFailed(null);

            const controller = new AbortController();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => controller.abort(), STRIPE_TIMEOUT_MS);

            try {
                const res = await fetch(endpoint, {
                    method: "POST",
                    signal: controller.signal,
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data?.url) {
                    // Hand off to Stripe; no plan change happens client-side.
                    window.location.href = data.url;
                    return;
                }
                throw new Error(data?.error || failureMsg);
            } catch {
                // Covers network failures, non-OK responses, and the 30s timeout
                // (AbortError). No plan change is applied; offer a retry CTA.
                toast.error(failureMsg);
                setFailed(kind);
                setPending(null);
            } finally {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            }
        },
        [isSignedIn, router, toast]
    );

    const handleUpgrade = useCallback(() => {
        void runStripeFlow(
            "upgrade",
            "/api/stripe/checkout",
            "Could not start checkout. Please try again."
        );
    }, [runStripeFlow]);

    const handleManageBilling = useCallback(() => {
        void runStripeFlow(
            "manage",
            "/api/stripe/portal",
            "Could not open the billing portal. Please try again."
        );
    }, [runStripeFlow]);

    return (
        <MarketingShell activeAnchor="pricing">
            <section className="hero-gradient relative overflow-hidden">
                <div
                    aria-hidden
                    className="accent-orb pointer-events-none absolute left-1/2 top-[-10%] h-[360px] w-[640px] -translate-x-1/2"
                />
                <div className="relative mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
                    <motion.div
                        initial={headerReveal.initial}
                        animate={headerReveal.animate}
                        transition={headerReveal.transition}
                        className="mx-auto max-w-2xl text-center"
                    >
                        <span className="font-mono-label inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-4 py-1.5 text-xs uppercase text-indigo-500 dark:text-indigo-300">
                            <SparklesIcon size={14} /> Pricing &amp; plans
                        </span>
                        <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl">
                            Simple, honest pricing
                        </h1>
                        <p className="mt-4 text-lg text-[var(--text-muted)]">
                            Start free. Upgrade when your search gets serious. No surprises, cancel
                            anytime.
                        </p>
                    </motion.div>

                    {/* ----------------------- Pricing cards ----------------------- */}
                    <motion.div
                        initial={cardsReveal.initial}
                        animate={cardsReveal.animate}
                        transition={cardsReveal.transition}
                        className="mx-auto mt-14 grid max-w-4xl items-stretch gap-8 md:grid-cols-2"
                    >
                        {/* Free plan */}
                        <div className="glass-panel gradient-border flex flex-col rounded-3xl p-8">
                            <div className="flex items-center justify-between">
                                <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
                                    Free
                                </h2>
                                {planAvailable && isFree && (
                                    <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-3 py-0.5 text-xs font-semibold text-[var(--text)]">
                                        Current plan
                                    </span>
                                )}
                            </div>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="font-display text-4xl font-bold text-[var(--text)]">
                                    $0
                                </span>
                                <span className="text-[var(--text-muted)]">/mo</span>
                            </div>
                            <p className="mt-4 text-sm text-[var(--text-muted)]">
                                Essential tools to organize the start of your search.
                            </p>
                            <ul className="mt-8 flex-1 space-y-4">
                                {PLAN_FEATURES.free.map((f) => (
                                    <li key={f} className="flex items-center gap-3">
                                        <CheckIcon size={18} className="shrink-0 text-indigo-500" />
                                        <span className="text-sm text-[var(--text)]">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-10">
                                {planAvailable && isFree ? (
                                    <Button variant="secondary" className="w-full" disabled>
                                        Your current plan
                                    </Button>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        onClick={() => router.push("/sign-up")}
                                    >
                                        Start for free
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Pro plan — recommended / highlighted */}
                        <div className="glass-panel relative flex flex-col rounded-3xl border-2 border-indigo-500 p-8 shadow-2xl shadow-indigo-500/10">
                            <span className="absolute -top-3.5 right-8 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
                                Most Popular
                            </span>
                            <div className="flex items-center justify-between">
                                <h2 className="font-display text-2xl font-semibold text-indigo-600 dark:text-indigo-300">
                                    Pro
                                </h2>
                                {planAvailable && isPro && (
                                    <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-3 py-0.5 text-xs font-semibold text-[var(--text)]">
                                        Current plan
                                    </span>
                                )}
                            </div>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="font-display text-4xl font-bold text-[var(--text)]">
                                    $9
                                </span>
                                <span className="text-[var(--text-muted)]">/mo</span>
                            </div>
                            <p className="mt-4 text-sm text-[var(--text-muted)]">
                                The full intelligence suite for a serious job search.
                            </p>
                            <ul className="mt-8 flex-1 space-y-4">
                                {PLAN_FEATURES.pro.map((f) => (
                                    <li key={f} className="flex items-center gap-3">
                                        <CheckIcon size={18} className="shrink-0 text-indigo-500" />
                                        <span className="text-sm text-[var(--text)]">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-10 flex flex-col gap-3">
                                {showUpgrade && (
                                    <Button
                                        className="w-full"
                                        onClick={handleUpgrade}
                                        loading={upgradeBusy}
                                        disabled={upgradeBusy}
                                    >
                                        {upgradeBusy
                                            ? "Starting checkout…"
                                            : upgradeFailed
                                              ? "Retry upgrade"
                                              : "Upgrade to Pro"}
                                        {!upgradeBusy && <ArrowRightIcon size={16} />}
                                    </Button>
                                )}
                                {showManage && (
                                    <Button
                                        variant={showUpgrade ? "secondary" : "primary"}
                                        className="w-full"
                                        onClick={handleManageBilling}
                                        loading={manageBusy}
                                        disabled={manageBusy}
                                    >
                                        {!manageBusy && <CreditCardIcon size={16} />}
                                        {manageBusy
                                            ? "Opening billing…"
                                            : manageFailed
                                              ? "Retry billing"
                                              : "Manage billing"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ----------------------- Comparison table ----------------------- */}
            <section className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">
                        Compare features
                    </h2>
                    <p className="mt-3 text-[var(--text-muted)]">
                        Everything in Free, plus the tools that close out a search, in Pro.
                    </p>
                </div>

                <div className="glass-panel gradient-border mt-10 overflow-hidden rounded-2xl">
                    <table className="w-full border-collapse text-left">
                        <caption className="sr-only">
                            Feature comparison between the Free and Pro plans
                        </caption>
                        <thead>
                            <tr className="border-b border-[var(--border)]">
                                <th scope="col" className="px-6 py-5 text-sm font-semibold text-[var(--text)]">
                                    Feature
                                </th>
                                <th scope="col" className="px-6 py-5 text-center text-sm font-semibold text-[var(--text)]">
                                    Free
                                </th>
                                <th scope="col" className="bg-indigo-500/5 px-6 py-5 text-center text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                                    Pro
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {COMPARISON_ROWS.map((row) => (
                                <tr key={row.label} className="border-b border-[var(--border)] last:border-b-0">
                                    <th scope="row" className="px-6 py-4 text-sm font-medium text-[var(--text)]">
                                        {row.label}
                                    </th>
                                    <td className="px-6 py-4 text-center">
                                        <ComparisonCell value={row.free} label={row.label} />
                                    </td>
                                    <td className="bg-indigo-500/5 px-6 py-4 text-center">
                                        <ComparisonCell value={row.pro} label={row.label} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* --------------------------- FAQ --------------------------- */}
            <section className="border-t border-[var(--border)] bg-[var(--surface-2)]/40">
                <div className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">
                            Frequently asked questions
                        </h2>
                        <p className="mt-3 text-[var(--text-muted)]">
                            Everything you need to know about plans and billing.
                        </p>
                    </div>

                    <FaqAccordion />

                    <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[var(--text-muted)]">
                        <span className="inline-flex items-center gap-2 text-xs">
                            <LockIcon size={16} /> Secure checkout
                        </span>
                        <span className="inline-flex items-center gap-2 text-xs">
                            <CreditCardIcon size={16} /> Powered by Stripe
                        </span>
                    </div>
                    <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
                        Secure checkout and billing powered by Stripe. Cancel anytime.
                    </p>
                </div>
            </section>
        </MarketingShell>
    );
}
