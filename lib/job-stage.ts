// lib/job-stage.ts
// Older job records can hold a stage like "Applied" (saved before the schema
// enforced lowercase). Every stage comparison in the app (filters, badges,
// scoring engines) expects the lowercase values, so stages are normalised on
// the way out of the database. scripts/normalize-job-stages.mjs fixes the data.

/** Lowercase and trim a stored stage value; non-strings pass through unchanged. */
export function normalizeStageValue<T>(stage: T): T {
    return (typeof stage === "string" ? stage.trim().toLowerCase() : stage) as T;
}

/** A copy of `job` with its stage normalised. */
export function withNormalizedStage<J extends object>(job: J): J {
    const stage = (job as { stage?: unknown }).stage;
    return stage === undefined ? job : { ...job, stage: normalizeStageValue(stage) };
}
