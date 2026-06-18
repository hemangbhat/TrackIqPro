"use client";
import React from "react";
import { Badge } from "./ui/primitives";
import { SparklesIcon } from "./ui/icons";
import { useUserPlan } from "./useUserPlan";
import { isPro } from "../lib/plans";

/**
 * PlanBadge reflects the user's current plan as either "Free" or "Pro",
 * derived from the authenticated useUserPlan hook and lib/plans.isPro.
 * While the plan is loading it renders a neutral placeholder so the chrome
 * layout does not shift.
 */
export function PlanBadge({ className }: { className?: string }) {
    const { plan, loading } = useUserPlan();

    if (loading) {
        return (
            <Badge tone="neutral" className={className}>
                <span className="opacity-60">Plan</span>
            </Badge>
        );
    }

    const pro = isPro(plan);
    return (
        <Badge tone={pro ? "pro" : "neutral"} className={className}>
            {pro && <SparklesIcon size={12} className="mr-1" />}
            {pro ? "Pro" : "Free"}
        </Badge>
    );
}
