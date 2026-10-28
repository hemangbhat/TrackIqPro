// lib/ai-sync.ts
// Keeps the AI vector index in step with Mongo when a user saves or deletes a
// job or note, and when their account is deleted. Every helper returns void
// immediately: the work runs in the background (see schedule) so a save is
// never slowed or failed by the AI service. Nothing is sent for users who have
// not opted in (CareerProfile.aiEnabled), or when the service is unconfigured.

import { waitUntil } from "@vercel/functions";
import CareerProfile from "../models/CareerProfile";
import Job from "../models/Job";
import Note from "../models/Note";
import {
    aiConfigured,
    deleteSources,
    deleteUserVectors,
    indexSources,
    INDEX_BATCH_SIZE,
    pingHealth,
    type SourceRef,
} from "./ai-client";
import { jobSourceRefs, jobToSources, noteToSource, type JobLike, type NoteLike } from "./ai-sources";

/**
 * The free-tier service can take 30-60s to wake from sleep. Sync runs in the
 * background (waitUntil), so it can afford to wait that out instead of failing;
 * the routes that schedule it set maxDuration = 60 to allow it.
 */
const SLOW = { timeoutMs: 50_000 };

/**
 * Run `work` in the background without blocking the response. The promise starts
 * running as soon as it is created, so it also completes locally and in tests;
 * waitUntil only asks Vercel to keep the function alive until it settles.
 */
function schedule(work: () => Promise<void>, label: string, userId?: string): void {
    const task = work().catch((error) => {
        // Log the error type only: never note content. userId is an id, not content;
        // it lets a failed account purge be cleaned up by hand.
        const who = userId ? ` userId=${userId}` : "";
        console.error(`AI sync failed (${label})${who}:`, error instanceof Error ? error.name : "unknown");
    });
    waitUntil(task);
}

async function userOptedIn(userId: string): Promise<boolean> {
    const profile = (await CareerProfile.findOne({ userId }).lean()) as { aiEnabled?: boolean } | null;
    return profile?.aiEnabled === true;
}

/** Gate shared by every sync except account deletion. */
async function shouldSync(userId: string): Promise<boolean> {
    return aiConfigured() && (await userOptedIn(userId));
}

/**
 * shouldSync, plus a health ping to start waking a sleeping service before the
 * first real call. pingHealth never throws; its result doesn't matter here.
 */
async function startSync(userId: string): Promise<boolean> {
    if (!(await shouldSync(userId))) return false;
    await pingHealth();
    return true;
}

// Job fields that appear in the job's own sources (title/company are in the text prefix).
const JOB_SOURCE_FIELDS = ["jobDescription", "notes", "title", "company"];
// Job fields copied onto each of the job's notes' metadata.
const NOTE_METADATA_FIELDS = ["title", "company"];

/**
 * `changedFields` (from a PUT/PATCH body) limits the re-embedding to what could
 * have changed; leave it undefined on create to index everything.
 *
 * The opt-in flag is re-checked before every later index call: disabling clears
 * the flag and then deletes vectors, so a batch sent after that would re-create
 * data for a user who has opted out.
 */
export function syncJobSaved(userId: string, job: JobLike, changedFields?: string[]): void {
    const touches = (fields: string[]) => !changedFields || fields.some((f) => changedFields.includes(f));

    schedule(async () => {
        if (!(await startSync(userId))) return;
        const jobId = String(job._id);

        if (touches(JOB_SOURCE_FIELDS)) {
            const sources = jobToSources(job);
            if (sources.length > 0) await indexSources(userId, sources, SLOW);

            // A field that was cleared must disappear from the index.
            const present = new Set(sources.map((s) => s.sourceType));
            const stale = jobSourceRefs(jobId).filter((ref) => !present.has(ref.sourceType));
            if (stale.length > 0) await deleteSources(userId, stale, SLOW);
        }

        // Notes carry the job's company/title, so refresh them when those change.
        if (touches(NOTE_METADATA_FIELDS)) {
            const notes = (await Note.find({ userId, jobId }).lean()) as unknown as NoteLike[];
            const noteSources = notes.flatMap((n) => noteToSource(n, job) ?? []);
            for (let i = 0; i < noteSources.length; i += INDEX_BATCH_SIZE) {
                if (!(await shouldSync(userId))) return;
                await indexSources(userId, noteSources.slice(i, i + INDEX_BATCH_SIZE), SLOW);
            }
        }
    }, "job saved");
}

/** Removes the job's own sources only; its notes stay indexed as history. */
export function syncJobDeleted(userId: string, jobId: string): void {
    schedule(async () => {
        if (!(await startSync(userId))) return;
        await deleteSources(userId, jobSourceRefs(jobId), SLOW);
    }, "job deleted");
}

export function syncNoteSaved(userId: string, note: NoteLike): void {
    schedule(async () => {
        if (!(await startSync(userId))) return;

        // The parent job is only needed for its company name.
        const job = note.jobId ? await findJob(userId, String(note.jobId)) : null;
        const source = noteToSource(note, job);
        if (source) {
            if (!(await shouldSync(userId))) return;
            await indexSources(userId, [source], SLOW);
        } else {
            // Blank note: nothing worth indexing, and any older version must go.
            await deleteSources(userId, [noteRef(note._id)], SLOW);
        }
    }, "note saved");
}

export function syncNoteDeleted(userId: string, noteId: string): void {
    schedule(async () => {
        if (!(await startSync(userId))) return;
        await deleteSources(userId, [noteRef(noteId)], SLOW);
    }, "note deleted");
}

/** Account deletion: no profile lookup, so vectors go even if the profile is gone. */
export function syncUserDeleted(userId: string): void {
    schedule(async () => {
        if (!aiConfigured()) return;
        await pingHealth();
        await deleteUserVectors(userId, SLOW);
    }, "user deleted", userId);
}

function noteRef(noteId: { toString(): string }): SourceRef {
    return { sourceType: "note", sourceId: String(noteId) };
}

async function findJob(userId: string, jobId: string): Promise<JobLike | null> {
    // A malformed jobId (it is a free string on Note) must not throw out of the sync.
    if (!/^[0-9a-fA-F]{24}$/.test(jobId)) return null;
    return (await Job.findOne({ _id: jobId, userId }).lean()) as unknown as JobLike | null;
}
