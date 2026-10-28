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
    type SourceRef,
} from "./ai-client";
import { jobSourceRefs, jobToSources, noteToSource, type JobLike, type NoteLike } from "./ai-sources";

const BATCH_SIZE = 50;

/**
 * Run `work` in the background without blocking the response. The promise starts
 * running as soon as it is created, so it also completes locally and in tests;
 * waitUntil only asks Vercel to keep the function alive until it settles.
 */
function schedule(work: () => Promise<void>, label: string): void {
    const task = work().catch((error) => {
        // Log the error type only: never note content.
        console.error(`AI sync failed (${label}):`, error instanceof Error ? error.name : "unknown");
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

export function syncJobSaved(userId: string, job: JobLike): void {
    schedule(async () => {
        if (!(await shouldSync(userId))) return;
        const jobId = String(job._id);

        const sources = jobToSources(job);
        if (sources.length > 0) await indexSources(userId, sources);

        // A field that was cleared must disappear from the index.
        const present = new Set(sources.map((s) => s.sourceType));
        const stale = jobSourceRefs(jobId).filter((ref) => !present.has(ref.sourceType));
        if (stale.length > 0) await deleteSources(userId, stale);

        // Notes carry the job's company/title, so refresh them too.
        const notes = (await Note.find({ userId, jobId }).lean()) as unknown as NoteLike[];
        const noteSources = notes.flatMap((n) => noteToSource(n, job) ?? []);
        for (let i = 0; i < noteSources.length; i += BATCH_SIZE) {
            await indexSources(userId, noteSources.slice(i, i + BATCH_SIZE));
        }
    }, "job saved");
}

/** Removes the job's own sources only; its notes stay indexed as history. */
export function syncJobDeleted(userId: string, jobId: string): void {
    schedule(async () => {
        if (!(await shouldSync(userId))) return;
        await deleteSources(userId, jobSourceRefs(jobId));
    }, "job deleted");
}

export function syncNoteSaved(userId: string, note: NoteLike): void {
    schedule(async () => {
        if (!(await shouldSync(userId))) return;

        // The parent job is only needed for its company name.
        const job = note.jobId ? await findJob(userId, String(note.jobId)) : null;
        const source = noteToSource(note, job);
        if (source) {
            await indexSources(userId, [source]);
        } else {
            // Blank note: nothing worth indexing, and any older version must go.
            await deleteSources(userId, [noteRef(note._id)]);
        }
    }, "note saved");
}

export function syncNoteDeleted(userId: string, noteId: string): void {
    schedule(async () => {
        if (!(await shouldSync(userId))) return;
        await deleteSources(userId, [noteRef(noteId)]);
    }, "note deleted");
}

/** Account deletion: no profile lookup, so vectors go even if the profile is gone. */
export function syncUserDeleted(userId: string): void {
    schedule(async () => {
        if (!aiConfigured()) return;
        await deleteUserVectors(userId);
    }, "user deleted");
}

function noteRef(noteId: { toString(): string }): SourceRef {
    return { sourceType: "note", sourceId: String(noteId) };
}

async function findJob(userId: string, jobId: string): Promise<JobLike | null> {
    // A malformed jobId (it is a free string on Note) must not throw out of the sync.
    if (!/^[0-9a-fA-F]{24}$/.test(jobId)) return null;
    return (await Job.findOne({ _id: jobId, userId }).lean()) as unknown as JobLike | null;
}
