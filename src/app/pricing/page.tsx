"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import MarketingShell from "../../../components/MarketingShell";
import { Spinner } from "../../../components/ui/primitives";
import { useUserPlan } from "../../../components/useUserPlan";
import { useToast } from "../../../components/ui/Toast";
import { FREE_JOB_LIMIT, type Plan } from "../../../lib/plans";
import { requestBillingUrl, type BillingEndpoint } from "../../../lib/billing-client";
import {
    CheckIcon,
    XIcon,
    CreditCardIcon,
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

function ComparisonCell({
    value,
    label,
    onField,
}: {
    value: boolean | string;
    label: string;
    onField?: boolean;
}) {
    if (typeof value === "string") {
        return <span className="font-semibold">{value}</span>;
    }
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

/** Three short answers: shown in full, no clicks to reveal them. */
function FaqList() {
    return (
        <dl className="border-t-2 border-[var(--ink)]">
            {FAQS.map((item) => (
                <div key={item.q} className="border-b border-[var(--hair)] py-6">
                    <dt className="text-xl font-bold tracking-[-0.01em]">{item.q}</dt>
                    <dd className="mt-2 max-w-[44rem] leading-relaxed text-[var(--ink-muted)]">{item.a}</dd>
                </div>
            ))}
        </dl>
    );
}

const container = "mx-auto w-full max-w-[90rem] px-4 sm:px-8 lg:px-12";

/* -------------------------------- Page --------------------------------- */

export default function PricingPage() {
    const router = useRouter();
    const { isSignedIn } = useUser();
    const { plan, customerId, loading: planLoading } = useUserPlan();
    const toast = useToast();

    const [pending, setPending] = useState<CtaKind | null>(null);
    const [failed, setFailed] = useState<CtaKind | null>(null);

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
    // Billing management needs a Stripe customer: never offer it to signed-out
    // visitors, or to Free users who have never paid (the portal would 400).
    const showManage = Boolean(isSignedIn) && (isPro || Boolean(customerId) || !planAvailable);

    const upgradeBusy = pending === "upgrade";
    const manageBusy = pending === "manage";
    const upgradeFailed = failed === "upgrade";
    const manageFailed = failed === "manage";

    const runStripeFlow = useCallback(
        async (kind: CtaKind, endpoint: BillingEndpoint, failureMsg: string) => {
            // Signed-out visitors have no billing context — route them to sign-up
            // rather than calling the authenticated Stripe endpoints.
            if (!isSignedIn) {
                router.push("/sign-up");
                return;
            }

            setPending(kind);
            setFailed(null);

            const result = await requestBillingUrl(endpoint, STRIPE_TIMEOUT_MS);
            if (result.ok) {
                // Hand off to Stripe; no plan change happens client-side.
                window.location.href = result.url;
                return;
            }
            // Network failures, non-OK responses and the 30s timeout all land
            // here. No plan change is applied; offer a retry CTA.
            toast.error(result.message ?? failureMsg);
            setFailed(kind);
            setPending(null);
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
            <section className={`${container} pb-20 pt-10 sm:pt-12 lg:pb-28`}>
                <h1 className="gw-display max-w-[16ch] text-[clamp(3rem,7vw,7.25rem)]">
                    Start free. Pay when it gets serious.
                </h1>
                <p className="mt-8 max-w-[36rem] text-lg leading-relaxed text-[var(--ink-muted)] sm:text-xl">
                    Every scoring engine is on the Free plan. No surprises, cancel anytime.
                </p>

                {/* ---------------------------- Plans ---------------------------- */}
                <div className="mt-14 grid border-2 border-[var(--ink)] md:grid-cols-2">
                    {/* Free plan */}
                    <div className="flex flex-col p-6 sm:p-10">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-3xl font-extrabold tracking-[-0.02em]">Free</h2>
                            {planAvailable && isFree && (
                                <span className="gw-label border-2 border-[var(--ink)] px-2 py-1">
                                    Current plan
                                </span>
                            )}
                        </div>
                        <p className="mt-8 flex items-baseline gap-2">
                            <span className="gw-num gw-wide text-[clamp(5rem,9vw,8rem)] leading-[0.8]">$0</span>
                            <span className="text-lg text-[var(--ink-muted)]">/month</span>
                        </p>
                        <p className="mt-6 text-[var(--ink-muted)]">
                            Everything you need to organize the start of your search.
                        </p>
                        <ul className="mt-8 flex-1 border-t-2 border-[var(--ink)]">
                            {PLAN_FEATURES.free.map((f) => (
                                <li key={f} className="flex items-center gap-3 border-b border-[var(--hair)] py-3">
                                    <CheckIcon size={18} className="shrink-0" aria-hidden />
                                    <span>{f}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-10">
                            {planAvailable && isFree ? (
                                <button type="button" className="gw-btn gw-btn-secondary w-full" disabled>
                                    Your current plan
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="gw-btn gw-btn-secondary w-full"
                                    onClick={() => router.push("/sign-up")}
                                >
                                    Start for free
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Pro plan — the ultramarine field */}
                    <div className="flex flex-col bg-[var(--ultra)] p-6 text-[var(--on-ultra)] sm:p-10">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-3xl font-extrabold tracking-[-0.02em]">Pro</h2>
                            {planAvailable && isPro && (
                                <span className="gw-label border-2 border-[var(--on-ultra)] px-2 py-1">
                                    Current plan
                                </span>
                            )}
                        </div>
                        <p className="mt-8 flex items-baseline gap-2">
                            <span className="gw-num gw-wide text-[clamp(5rem,9vw,8rem)] leading-[0.8]">$9</span>
                            <span className="text-lg text-[var(--on-ultra-muted)]">/month</span>
                        </p>
                        <p className="mt-6 text-[var(--on-ultra-muted)]">
                            No application limit, plus export, for a search in full swing.
                        </p>
                        <ul className="mt-8 flex-1 border-t-2 border-[var(--on-ultra)]">
                            {PLAN_FEATURES.pro.map((f) => (
                                <li
                                    key={f}
                                    className="flex items-center gap-3 border-b border-[var(--on-ultra)]/30 py-3"
                                >
                                    <CheckIcon size={18} className="shrink-0" aria-hidden />
                                    <span>{f}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-10 flex flex-col gap-3">
                            {showUpgrade && (
                                <button
                                    type="button"
                                    className="gw-btn gw-btn-inverse w-full"
                                    onClick={handleUpgrade}
                                    disabled={upgradeBusy}
                                    aria-busy={upgradeBusy || undefined}
                                >
                                    {upgradeBusy && <Spinner size={16} />}
                                    {upgradeBusy
                                        ? "Starting checkout…"
                                        : upgradeFailed
                                          ? "Retry upgrade"
                                          : "Upgrade to Pro"}
                                </button>
                            )}
                            {showManage && (
                                <button
                                    type="button"
                                    className={`gw-btn w-full ${showUpgrade ? "gw-btn-outline-inverse" : "gw-btn-inverse"}`}
                                    onClick={handleManageBilling}
                                    disabled={manageBusy}
                                    aria-busy={manageBusy || undefined}
                                >
                                    {manageBusy ? <Spinner size={16} /> : <CreditCardIcon size={16} aria-hidden />}
                                    {manageBusy
                                        ? "Opening billing…"
                                        : manageFailed
                                          ? "Retry billing"
                                          : "Manage billing"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ----------------------- Comparison table ----------------------- */}
            <section className="border-t-2 border-[var(--ink)]">
                <div className={`${container} grid gap-10 py-20 lg:grid-cols-12 lg:gap-6 lg:py-28`}>
                    <div className="lg:col-span-4">
                        <h2 className="gw-display text-[clamp(2.25rem,4vw,3.75rem)]">Compare features</h2>
                        <p className="mt-5 max-w-[26rem] text-lg leading-relaxed text-[var(--ink-muted)]">
                            Everything in Free, plus the tools that close out a search, in Pro.
                        </p>
                    </div>
                    <table className="w-full border-collapse text-left lg:col-span-7 lg:col-start-6">
                        <caption className="sr-only">
                            Feature comparison between the Free and Pro plans
                        </caption>
                        <thead>
                            <tr className="border-b-2 border-[var(--ink)]">
                                <th scope="col" className="py-4 pr-4 text-sm font-semibold text-[var(--ink-muted)]">
                                    Feature
                                </th>
                                <th scope="col" className="w-[26%] px-4 py-4 text-xl font-bold">
                                    Free
                                </th>
                                <th
                                    scope="col"
                                    className="w-[26%] bg-[var(--ultra)] px-4 py-4 text-xl font-bold text-[var(--on-ultra)]"
                                >
                                    Pro
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {COMPARISON_ROWS.map((row) => (
                                <tr key={row.label} className="border-b border-[var(--hair)]">
                                    <th scope="row" className="py-4 pr-4 font-semibold">
                                        {row.label}
                                    </th>
                                    <td className="px-4 py-4">
                                        <ComparisonCell value={row.free} label={row.label} />
                                    </td>
                                    <td className="bg-[var(--ultra)] px-4 py-4 text-[var(--on-ultra)]">
                                        <ComparisonCell value={row.pro} label={row.label} onField />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* --------------------------- FAQ --------------------------- */}
            <section className="border-t-2 border-[var(--ink)]">
                <div className={`${container} grid gap-10 py-20 lg:grid-cols-12 lg:gap-6 lg:py-28`}>
                    <div className="lg:col-span-4">
                        <h2 className="gw-display text-[clamp(2.25rem,4vw,3.75rem)]">Questions</h2>
                        <p className="mt-5 max-w-[26rem] text-lg leading-relaxed text-[var(--ink-muted)]">
                            Plans and billing, answered plainly.
                        </p>
                    </div>
                    <div className="lg:col-span-7 lg:col-start-6">
                        <FaqList />
                        <p className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--ink-muted)]">
                            <span className="inline-flex items-center gap-2">
                                <LockIcon size={16} aria-hidden /> Secure checkout
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <CreditCardIcon size={16} aria-hidden /> Billing handled by Stripe. Cancel anytime.
                            </span>
                        </p>
                    </div>
                </div>
            </section>
        </MarketingShell>
    );
}
