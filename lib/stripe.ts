import UserPlan from "../models/UserPlan";
import { Plan, PlanStatus, UserPlanData } from "./plans";

// Re-export client-safe types/constants so existing server imports keep working.
export type { Plan, PlanStatus, UserPlanData } from "./plans";
export { FREE_JOB_LIMIT, isPro } from "./plans";

export async function getUserPlan(userId: string): Promise<UserPlanData> {
    const record = await UserPlan.findOne({ userId }).lean<{
        plan?: string;
        customerId?: string | null;
        status?: string;
        trialEnd?: Date | null;
    }>();

    return {
        plan: (record?.plan as Plan) || "free",
        customerId: record?.customerId ?? null,
        status: (record?.status as PlanStatus) || "active",
        trialEnd: record?.trialEnd ?? null,
    };
}

export async function updateUserPlanInDB(
    userId: string,
    plan: Plan,
    customerId: string | null,
    status: PlanStatus = "active",
    trialEnd: Date | null = null
) {
    return UserPlan.findOneAndUpdate(
        { userId },
        { plan, customerId, status, trialEnd },
        { upsert: true, new: true }
    );
}
