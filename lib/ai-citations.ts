// lib/ai-citations.ts
// Pure helper that removes citations pointing at sources the user has since
// deleted (the vector index can lag behind Mongo). The prep route does the Mongo
// lookups and passes in the ids that still exist; this file only filters.

import type { Citation, PrepResult } from "./ai-client";

export const EMPTY_DATA_MESSAGE = "Add notes from your rounds to get prep tailored to you";

/** A note citation needs its note to exist; job_description / job_notes need their job. */
function isLive(c: Citation, noteIds: Set<string>, jobIds: Set<string>): boolean {
    return c.sourceType === "note" ? noteIds.has(c.sourceId) : jobIds.has(c.sourceId);
}

/** Keep only live citations, drop items left with none, flag the result if nothing is left. */
export function filterStaleCitations(
    result: PrepResult,
    existingNoteIds: Set<string>,
    existingJobIds: Set<string>
): PrepResult {
    if (result.insufficientData) return result;

    const live = (citations: Citation[]) => citations.filter((c) => isLive(c, existingNoteIds, existingJobIds));

    const likelyQuestions = result.likelyQuestions
        .map((q) => ({ ...q, citations: live(q.citations) }))
        .filter((q) => q.citations.length > 0);
    const weakSpots = result.weakSpots
        .map((w) => ({ ...w, citations: live(w.citations) }))
        .filter((w) => w.citations.length > 0);
    const studyPlan = result.studyPlan
        .map((s) => ({ ...s, citations: live(s.citations) }))
        .filter((s) => s.citations.length > 0);

    if (likelyQuestions.length + weakSpots.length + studyPlan.length === 0) {
        return { ...result, insufficientData: true, message: EMPTY_DATA_MESSAGE, likelyQuestions, weakSpots, studyPlan };
    }
    return { ...result, likelyQuestions, weakSpots, studyPlan };
}
