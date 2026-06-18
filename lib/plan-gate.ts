// lib/plan-gate.ts
//
// Centralized, presentation-layer Plan_Gate for Pro-only actions.
//
// This module is PURE (no React, no side effects, no network) so it can be
// unit/property tested in isolation and reused by the Offers / Jobs / Settings
// pages, the JobFormDrawer, and the usePlanGate hook.
//
// The gate is ADVISORY only: it mirrors the server's authoritative enforcement
// so the UI never *offers* a Pro-only action to a Free_User, but the server
// remains the source of truth. When the server rejects a gated action,
// `interpretServerRejection` maps the rejection back to the matching upgrade
// prompt so the UI can react without changing any API contract.
//
// Gated actions:
//   - export    -> Pro-only (Free_User is always gated)
//   - create-job -> gated for Free_User once jobCount >= FREE_JOB_LIMIT
//
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

import { FREE_JOB_LIMIT, isPro } from "./plans";

/** The route the upgrade prompt navigates to (Requirement 4.7). */
export const PRICING_PATH = "/pricing";

/** The Pro-only actions the gate guards. */
export type GatedAction = "export" | "create-job";

/** Why a gated action is allowed or denied. */
export type GateReason = "ok" | "pro-required" | "free-limit-reached";

/** The advisory decision for a single gated action. */
export interface GateDecision {
    /** The action this decision concerns. */
    action: GatedAction;
    /** True when the UI may offer/enable the action. */
    allowed: boolean;
    /** Machine-readable reason for the decision. */
    reason: GateReason;
    /**
     * The upgrade-prompt copy to surface when `allowed` is false; `null` when
     * the action is allowed. Identifies the gated feature (Req 4.1, 4.2).
     */
    message: string | null;
}

/** Upgrade-prompt copy identifying export as a Pro_User feature (Req 4.1). */
export const EXPORT_UPGRADE_MESSAGE =
    "Exporting your data is a Pro feature. Upgrade to Pro to export.";

/** Upgrade-prompt copy for the free job-creation limit (Req 4.2). */
export const JOB_LIMIT_UPGRADE_MESSAGE = `You've reached the Free plan limit of ${FREE_JOB_LIMIT} jobs. Upgrade to Pro to add more.`;

/**
 * Whether the export action is permitted. Pro_User only (Req 4.1, 4.3).
 */
export function canExport(plan?: string | null): boolean {
    return isPro(plan);
}

/**
 * Whether job creation is permitted for the given plan + current job count.
 * Pro_User is never limited (Req 4.4); Free_User is permitted only while the
 * job count is below FREE_JOB_LIMIT (Req 4.2).
 */
export function canCreateJob(plan?: string | null, jobCount = 0): boolean {
    if (isPro(plan)) return true;
    return jobCount < FREE_JOB_LIMIT;
}

/**
 * Whether a Free_User has reached/exceeded the free job limit. Always false
 * for a Pro_User (no limit applies — Req 4.4).
 */
export function isAtJobLimit(plan?: string | null, jobCount = 0): boolean {
    return !isPro(plan) && jobCount >= FREE_JOB_LIMIT;
}

/** Advisory decision for the export action (Req 4.1, 4.3). */
export function gateExport(plan?: string | null): GateDecision {
    const allowed = canExport(plan);
    return {
        action: "export",
        allowed,
        reason: allowed ? "ok" : "pro-required",
        message: allowed ? null : EXPORT_UPGRADE_MESSAGE,
    };
}

/** Advisory decision for the create-job action (Req 4.2, 4.4). */
export function gateCreateJob(
    plan?: string | null,
    jobCount = 0
): GateDecision {
    const allowed = canCreateJob(plan, jobCount);
    return {
        action: "create-job",
        allowed,
        reason: allowed ? "ok" : "free-limit-reached",
        message: allowed ? null : JOB_LIMIT_UPGRADE_MESSAGE,
    };
}

/**
 * Whether an HTTP status from a gated mutation represents a plan-gating
 * rejection by the authoritative server. The jobs API rejects the free-tier
 * limit with 403; 402 (Payment Required) is also treated as a plan rejection
 * for forward-compatibility. (Req 4.5)
 */
export function isPlanRejection(status: number): boolean {
    return status === 403 || status === 402;
}

/**
 * Map an authoritative server rejection of a gated action to the matching
 * advisory GateDecision so the UI can surface the correct upgrade prompt
 * WITHOUT resubmitting the request (Req 4.5, 4.6). The server is the source of
 * truth: a rejection always yields `allowed: false` with the action's prompt.
 */
export function interpretServerRejection(action: GatedAction): GateDecision {
    if (action === "export") {
        return {
            action,
            allowed: false,
            reason: "pro-required",
            message: EXPORT_UPGRADE_MESSAGE,
        };
    }
    return {
        action,
        allowed: false,
        reason: "free-limit-reached",
        message: JOB_LIMIT_UPGRADE_MESSAGE,
    };
}
