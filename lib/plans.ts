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
