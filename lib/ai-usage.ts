// lib/ai-usage.ts
// Daily cap on AI prep requests: DAILY_PREP_LIMIT per user per UTC day,
// tracked in the AiUsage collection.
//
// The cap is atomic under concurrent requests (no separate read-then-write).
// consumePrep does one findOneAndUpdate with the filter `count < limit` plus
// upsert. Below the limit it increments. At the limit the filter matches
// nothing, so the upsert tries to insert a second { userId, date } document and
// the unique index on (userId, date) rejects it with a duplicate-key error
// (11000), which is how we know the user is at the cap.
//
// Catch: on a fresh day several requests can upsert at once and all try to
// insert. MongoDB only retries that collision itself when the filter is pure
// equality, and ours has `$lt`, so the losers get 11000 even though the user is
// under the cap. Hence the single retry: by then the document exists, so the
// retry either increments or is a genuine denial.

import AiUsage from "../models/AiUsage";

export const DAILY_PREP_LIMIT = 5;

/** Today's date (or the given one) as YYYY-MM-DD in UTC. */
export function utcDay(d: Date = new Date()): string {
    return d.toISOString().slice(0, 10);
}

function isDuplicateKey(e: unknown): boolean {
    return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

function tryIncrement(userId: string, date: string) {
    return AiUsage.findOneAndUpdate(
        { userId, date, count: { $lt: DAILY_PREP_LIMIT } },
        { $inc: { count: 1 } },
        { upsert: true, new: true }
    );
}

/**
 * Try to use one prep. Returns whether it was allowed, how many remain, and the
 * UTC date consumed (pass it to refundPrep so a refund after midnight still
 * hits the right day).
 */
export async function consumePrep(
    userId: string
): Promise<{ allowed: boolean; remaining: number; date: string }> {
    const date = utcDay();
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const doc = await tryIncrement(userId, date);
            return { allowed: true, remaining: DAILY_PREP_LIMIT - doc.count, date };
        } catch (e) {
            if (!isDuplicateKey(e)) throw e;
            // Either a fresh-day insert race (retry succeeds) or truly at the limit (retry collides again).
        }
    }
    return { allowed: false, remaining: 0, date };
}

/** Give back one prep (e.g. the AI call failed). Never drops below zero. */
export async function refundPrep(userId: string, date: string = utcDay()): Promise<void> {
    await AiUsage.updateOne({ userId, date, count: { $gt: 0 } }, { $inc: { count: -1 } });
}

/** Preps the user can still make today. */
export async function remainingPreps(userId: string): Promise<number> {
    const doc = await AiUsage.findOne({ userId, date: utcDay() });
    return DAILY_PREP_LIMIT - (doc?.count ?? 0);
}
