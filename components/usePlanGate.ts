"use client";
// components/usePlanGate.ts
//
// React hook that binds the pure Plan_Gate (lib/plan-gate) to the current
// user's plan (useUserPlan) and to client navigation. Pages consume this to
// gate Pro-only actions consistently:
//
//   const gate = usePlanGate();
//   gate.exportGate.allowed         // enable/disable export (Req 4.1, 4.3)
//   gate.createJobGate(jobCount)    // enable/disable job-create submit (Req 4.2, 4.4)
//   gate.goToPricing()              // upgrade-prompt selection -> /pricing (Req 4.7)
//   gate.handleServerRejection("create-job") // server-authoritative (Req 4.5, 4.6)
//
// The hook performs no fetching of its own and changes no API contract.
//
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUserPlan } from "./useUserPlan";
import {
    gateExport,
    gateCreateJob,
    interpretServerRejection,
    PRICING_PATH,
    type GateDecision,
    type GatedAction,
} from "../lib/plan-gate";

export interface UsePlanGate {
    /** The resolved plan ("free" | "pro") or null before it loads. */
    plan: "free" | "pro" | null;
    /** Convenience flag mirroring lib/plans.isPro. */
    isPro: boolean;
    /** True while the plan is still being fetched. */
    loading: boolean;
    /** Advisory decision for the export action (Req 4.1, 4.3). */
    exportGate: GateDecision;
    /** Advisory decision for creating a job given the current job count (Req 4.2, 4.4). */
    createJobGate: (jobCount: number) => GateDecision;
    /**
     * Map an authoritative server rejection of a gated action to the matching
     * upgrade prompt without resubmitting (Req 4.5, 4.6).
     */
    handleServerRejection: (action: GatedAction) => GateDecision;
    /** Navigate to the pricing page (upgrade-prompt selection — Req 4.7). */
    goToPricing: () => void;
}

export function usePlanGate(): UsePlanGate {
    const { plan, isPro, loading } = useUserPlan();
    const router = useRouter();

    const goToPricing = useCallback(() => {
        router.push(PRICING_PATH);
    }, [router]);

    const exportGate = useMemo(() => gateExport(plan), [plan]);

    const createJobGate = useCallback(
        (jobCount: number) => gateCreateJob(plan, jobCount),
        [plan]
    );

    const handleServerRejection = useCallback(
        (action: GatedAction) => interpretServerRejection(action),
        []
    );

    return {
        plan,
        isPro,
        loading,
        exportGate,
        createJobGate,
        handleServerRejection,
        goToPricing,
    };
}

export default usePlanGate;
