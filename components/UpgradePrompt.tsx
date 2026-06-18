"use client";
// components/UpgradePrompt.tsx
//
// Presentation-only upgrade prompt surfaced when a Pro-only action is gated.
// Selecting the prompt navigates to /pricing (Requirement 4.7). Two variants:
//
//   - "inline" : a compact banner for inside a drawer/section (e.g. the
//                JobFormDrawer free-limit notice, the Settings data section).
//   - "card"   : a centered EmptyState-style block (e.g. a gated Offers/Data
//                export panel), reusing the LockedFeature look.
//
// Navigation uses the App Router `useRouter().push`, which is effectively
// instantaneous (well within the 1s budget). A caller may override navigation
// via `onUpgrade` (e.g. to use usePlanGate().goToPricing).
//
// Requirements: 4.1, 4.2, 4.7

import React from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState } from "./ui/primitives";
import { SparklesIcon, LockIcon } from "./ui/icons";
import { PRICING_PATH } from "../lib/plan-gate";

export interface UpgradePromptProps {
    /** Prompt copy identifying the gated feature. */
    message: string;
    /** Visual treatment. Defaults to "inline". */
    variant?: "inline" | "card";
    /** CTA label. Defaults to "Upgrade to Pro". */
    ctaLabel?: string;
    /** Heading for the "card" variant. Defaults to "Pro feature". */
    title?: string;
    /**
     * Optional navigation override. When omitted the prompt navigates to
     * /pricing itself (Requirement 4.7).
     */
    onUpgrade?: () => void;
    className?: string;
}

export default function UpgradePrompt({
    message,
    variant = "inline",
    ctaLabel = "Upgrade to Pro",
    title = "Pro feature",
    onUpgrade,
    className,
}: UpgradePromptProps) {
    const router = useRouter();

    const handleUpgrade = React.useCallback(() => {
        if (onUpgrade) {
            onUpgrade();
            return;
        }
        router.push(PRICING_PATH);
    }, [onUpgrade, router]);

    if (variant === "card") {
        return (
            <div className={className}>
                <EmptyState
                    icon={<LockIcon />}
                    title={title}
                    description={message}
                    action={
                        <Button onClick={handleUpgrade}>
                            <SparklesIcon size={16} /> {ctaLabel}
                        </Button>
                    }
                />
            </div>
        );
    }

    // inline
    return (
        <div
            role="status"
            className={
                "flex flex-col gap-3 rounded-lg border border-indigo-500/40 bg-indigo-500/10 p-4 sm:flex-row sm:items-center sm:justify-between " +
                (className ?? "")
            }
        >
            <p className="flex items-start gap-2 text-sm text-[var(--text)]">
                <LockIcon size={16} />
                <span>{message}</span>
            </p>
            <Button size="sm" onClick={handleUpgrade} className="shrink-0">
                <SparklesIcon size={16} /> {ctaLabel}
            </Button>
        </div>
    );
}
