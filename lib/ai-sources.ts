// lib/ai-sources.ts
// Pure mapping from Mongo job/note documents to the IndexSource payloads the AI
// service indexes. Must stay identical to build_sources in
// ai-service/scripts/reindex.py (the tests mirror its cases).

import type { IndexSource, SourceRef } from "./ai-client";

type Id = string | { toString(): string };
type DateLike = Date | string | undefined | null;

export interface JobLike {
    _id: Id;
    title: string;
    company: string;
    jobDescription?: string | null;
    notes?: string | null;
    createdAt?: DateLike;
}

export interface NoteLike {
    _id: Id;
    jobId?: string | null;
    title?: string | null;
    content?: string | null;
    round?: string | null;
    createdAt?: DateLike;
}

// createdAt is informational metadata, never compared or sorted, so toISOString here vs
// Python isoformat in reindex.py is a harmless format difference.
function iso(value: DateLike): string {
    if (value instanceof Date) return value.toISOString();
    return value ? String(value) : "";
}

function hasText(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/** A job yields up to two sources: its description and its free-form notes. */
export function jobToSources(job: JobLike): IndexSource[] {
    const jobId = String(job._id);
    const prefix = `${job.title} at ${job.company}\n\n`;
    const fields = [
        ["job_description", job.jobDescription],
        ["job_notes", job.notes],
    ] as const;

    const sources: IndexSource[] = [];
    for (const [sourceType, body] of fields) {
        if (!hasText(body)) continue;
        sources.push({
            sourceType,
            sourceId: jobId,
            jobId,
            company: job.company,
            title: job.title,
            round: "",
            createdAt: iso(job.createdAt),
            text: prefix + body,
        });
    }
    return sources;
}

/** A note is one source; null when both its title and content are blank. */
export function noteToSource(note: NoteLike, job?: JobLike | null): IndexSource | null {
    const title = note.title || "";
    const content = note.content || "";
    if (!hasText(title) && !hasText(content)) return null;
    return {
        sourceType: "note",
        sourceId: String(note._id),
        jobId: note.jobId ? String(note.jobId) : "none",
        // Only trust the parent job if it really is this note's job (Python looks it up by note.jobId).
        company: job && note.jobId && String(job._id) === String(note.jobId) ? job.company : "",
        title,
        round: note.round || "",
        createdAt: iso(note.createdAt),
        text: `${title}\n\n${content}`,
    };
}

/** Both source references a job can own, for deleting its vectors. */
export function jobSourceRefs(jobId: string): SourceRef[] {
    return [
        { sourceType: "job_description", sourceId: jobId },
        { sourceType: "job_notes", sourceId: jobId },
    ];
}
