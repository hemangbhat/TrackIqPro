// Client-safe plan constants and pure helpers.
// IMPORTANT: this file must NOT import any server-only modules (e.g. Mongoose
// models) so it can be safely bundled into client components.

export type Plan = "free" | "pro";
export type PlanStatus = "active" | "past_due" | "canceled" | "trialing";

export const FREE_JOB_LIMIT = 10;

export interface UserPlanData {
    plan: Plan;
    customerId: string | null;
    status: PlanStatus;
    trialEnd: Date | null;
}

/** A user counts as "pro" when on the pro plan. */
export function isPro(plan?: string | null): boolean {
    return plan === "pro";
}

/**
 * Map a Stripe subscription status to the plan/status we persist.
 *
 * Only `active` and `trialing` subscriptions grant Pro. Every other status —
 * including ones Stripe may add later (`incomplete`, `incomplete_expired`,
 * `paused`, …) — fails closed to Free, so an unexpected status can never
 * unlock paid features.
 */
export function planFromSubscriptionStatus(stripeStatus: string): {
    plan: Plan;
    status: PlanStatus;
} {
    switch (stripeStatus) {
        case "active":
            return { plan: "pro", status: "active" };
        case "trialing":
            return { plan: "pro", status: "trialing" };
        case "past_due":
        case "unpaid":
            return { plan: "free", status: "past_due" };
        default:
            return { plan: "free", status: "canceled" };
    }
}
