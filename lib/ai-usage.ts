// lib/ai-usage.ts
// Daily cap on AI prep requests: DAILY_PREP_LIMIT per user per UTC day,
// tracked in the AiUsage collection.
//
// The cap is atomic under concurrent requests. consumePrep does a single
// findOneAndUpdate with the filter `count < limit` plus upsert. Below the limit
// it increments. At the limit the filter matches nothing, so the upsert tries
// to insert a second { userId, date } document and the unique index on
// (userId, date) rejects it with a duplicate-key error (11000). That error is
// how we know the user is at the cap, with no read-then-write race.

import AiUsage from "../models/AiUsage";

export const DAILY_PREP_LIMIT = 5;

/** Today's date (or the given one) as YYYY-MM-DD in UTC. */
export function utcDay(d: Date = new Date()): string {
    return d.toISOString().slice(0, 10);
}

function isDuplicateKey(e: unknown): boolean {
    return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

/** Try to use one prep. Returns whether it was allowed and how many remain. */
export async function consumePrep(
    userId: string
): Promise<{ allowed: boolean; remaining: number }> {
    const date = utcDay();
    try {
        const doc = await AiUsage.findOneAndUpdate(
            { userId, date, count: { $lt: DAILY_PREP_LIMIT } },
            { $inc: { count: 1 } },
            { upsert: true, new: true }
        );
        return { allowed: true, remaining: DAILY_PREP_LIMIT - doc.count };
    } catch (e) {
        // Filter missed because the user is at the limit -> upsert collides with the existing doc.
        if (isDuplicateKey(e)) return { allowed: false, remaining: 0 };
        throw e;
    }
}

/** Give back one prep (e.g. the AI call failed). Never drops below zero. */
export async function refundPrep(userId: string): Promise<void> {
    await AiUsage.updateOne(
        { userId, date: utcDay(), count: { $gt: 0 } },
        { $inc: { count: -1 } }
    );
}

/** Preps the user can still make today. */
export async function remainingPreps(userId: string): Promise<number> {
    const doc = await AiUsage.findOne({ userId, date: utcDay() });
    return DAILY_PREP_LIMIT - (doc?.count ?? 0);
}
