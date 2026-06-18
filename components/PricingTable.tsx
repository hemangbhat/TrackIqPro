"use client";
import React from "react";
import { Button } from "./ui/primitives";
import { CheckIcon, XIcon, ArrowRightIcon, CreditCardIcon } from "./ui/icons";
import { FREE_JOB_LIMIT, type Plan } from "../lib/plans";

/**
 * Presentation-only pricing comparison table.
 *
 * The table renders one column per plan (Free / Pro) and one row per compared
 * feature, with a persistent "Recommended" highlight on the Pro column
 * (Requirement 12.1). The current plan is indicated when `currentPlan` is
 * provided; when it is omitted (plan data unavailable) no current-plan
 * indicator is shown and BOTH CTAs are presented (Requirements 12.4, 12.7).
 *
 * All async work (Stripe checkout / billing portal, the 30s timeout, toasts
 * and retry state) is owned by the page; this component only renders the CTAs
 * and reflects their busy / failed state (Requirements 12.5, 12.6).
 */
export interface PricingTableProps {
    /** Current plan from `useUserPlan`. Omit when plan data is unavailable. */
    currentPlan?: Plan;
    /** Starts the existing Stripe checkout flow. */
    onUpgrade: () => void;
    /** Starts the existing Stripe billing-portal flow. */
    onManageBilling: () => void;
    /** Which CTA currently has a request in progress. */
    pending?: "upgrade" | "manage" | null;
    /** Which CTA's last request failed (drives the retry affordance). */
    failed?: "upgrade" | "manage" | null;
}

type FeatureRow = { label: string; free: boolean | string; pro: boolean | string };

const FEATURE_ROWS: FeatureRow[] = [
    { label: "Application tracking", free: `Up to ${FREE_JOB_LIMIT}`, pro: "Unlimited" },
    { label: "Interview notes", free: true, pro: true },
    { label: "Offer comparison engine", free: true, pro: true },
    { label: "Analytics dashboard", free: true, pro: true },
    { label: "CSV export", free: false, pro: true },
    { label: "Priority support", free: false, pro: true },
];

function FeatureCell({ value, label }: { value: boolean | string; label: string }) {
    if (typeof value === "string") {
        return <span className="text-sm text-[var(--text)]">{value}</span>;
    }
    return value ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckIcon size={16} className="text-emerald-500" aria-hidden="true" />
            <span className="sr-only">{label}: included</span>
            <span aria-hidden="true">Included</span>
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <XIcon size={16} className="text-[var(--text-muted)]/50" aria-hidden="true" />
            <span className="sr-only">{label}: not included</span>
            <span aria-hidden="true">—</span>
        </span>
    );
}

function CurrentPlanTag() {
    return (
        <span className="mt-1 inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text)]">
            Current plan
        </span>
    );
}

export default function PricingTable({
    currentPlan,
    onUpgrade,
    onManageBilling,
    pending = null,
    failed = null,
}: PricingTableProps) {
    // When plan data is unavailable we show no current-plan indicator and both CTAs.
    const planAvailable = currentPlan === "free" || currentPlan === "pro";
    const isFree = currentPlan === "free";
    const isPro = currentPlan === "pro";

    const upgradeBusy = pending === "upgrade";
    const manageBusy = pending === "manage";
    const upgradeFailed = failed === "upgrade";
    const manageFailed = failed === "manage";

    // Upgrade CTA — shown to Free users and when plan data is unavailable.
    const showUpgrade = isFree || !planAvailable;
    // Manage-billing CTA — shown to Pro users and when plan data is unavailable.
    const showManage = isPro || !planAvailable;

    return (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                    Feature comparison between the Free and Pro plans
                </caption>
                <thead>
                    <tr className="border-b border-[var(--border)]">
                        <th scope="col" className="p-4 align-bottom sm:p-6">
                            <span className="text-sm font-medium text-[var(--text-muted)]">
                                Compare plans
                            </span>
                        </th>

                        {/* Free column */}
                        <th scope="col" className="p-4 text-center align-bottom sm:p-6">
                            <div className="flex flex-col items-center">
                                <span className="text-base font-semibold text-[var(--text)]">
                                    Free
                                </span>
                                <span className="mt-1 text-2xl font-extrabold text-[var(--text)]">
                                    $0
                                    <span className="text-sm font-medium text-[var(--text-muted)]">
                                        /mo
                                    </span>
                                </span>
                                {planAvailable && isFree && <CurrentPlanTag />}
                            </div>
                        </th>

                        {/* Pro column — persistent recommended highlight */}
                        <th
                            scope="col"
                            className="relative bg-indigo-500/5 p-4 text-center align-bottom sm:p-6"
                        >
                            <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                                Recommended
                            </span>
                            <div className="flex flex-col items-center">
                                <span className="text-base font-semibold text-indigo-600 dark:text-indigo-300">
                                    Pro
                                </span>
                                <span className="mt-1 text-2xl font-extrabold text-[var(--text)]">
                                    $9
                                    <span className="text-sm font-medium text-[var(--text-muted)]">
                                        /mo
                                    </span>
                                </span>
                                {planAvailable && isPro && <CurrentPlanTag />}
                            </div>
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {FEATURE_ROWS.map((row) => (
                        <tr
                            key={row.label}
                            className="border-b border-[var(--border)] last:border-b-0"
                        >
                            <th
                                scope="row"
                                className="p-4 text-sm font-medium text-[var(--text)] sm:px-6"
                            >
                                {row.label}
                            </th>
                            <td className="p-4 text-center sm:px-6">
                                <FeatureCell value={row.free} label={row.label} />
                            </td>
                            <td className="bg-indigo-500/5 p-4 text-center sm:px-6">
                                <FeatureCell value={row.pro} label={row.label} />
                            </td>
                        </tr>
                    ))}
                </tbody>

                <tfoot>
                    <tr>
                        <td className="p-4 sm:p-6" />
                        {/* Free CTA cell */}
                        <td className="p-4 text-center align-top sm:p-6">
                            {showManage && !showUpgrade ? null : (
                                <span className="text-xs text-[var(--text-muted)]">
                                    {planAvailable && isFree
                                        ? "You're on Free"
                                        : "Free forever"}
                                </span>
                            )}
                        </td>
                        {/* Pro CTA cell */}
                        <td className="bg-indigo-500/5 p-4 text-center align-top sm:p-6">
                            <div className="flex flex-col items-stretch gap-2">
                                {showUpgrade && (
                                    <Button
                                        className="w-full"
                                        onClick={onUpgrade}
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
                                        onClick={onManageBilling}
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
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
