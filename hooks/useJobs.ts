"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Job } from "../types";

export type JobInput = Partial<Omit<Job, "_id" | "userId">>;

/**
 * The user's jobs, plus mutations that keep the list in step. Pass `id` to load
 * just that one job (the details page) instead of the whole list: `jobs` is
 * then `[job]`, or `[]` when it doesn't exist or isn't theirs.
 */
export function useJobs(opts: { id?: string } = {}) {
    const { id } = opts;
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Each fetch takes a number; only the latest one may write state, so
    // switching from job A to job B can't end up showing A's late response.
    const latestRequest = useRef(0);

    const fetchJobs = useCallback(async () => {
        const request = ++latestRequest.current;
        const current = () => request === latestRequest.current;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(id ? `/api/jobs/${encodeURIComponent(id)}` : "/api/jobs");
            // A missing (or someone else's) job is "not found", not a load error.
            if (id && (res.status === 404 || res.status === 400)) {
                if (current()) setJobs([]);
                return;
            }
            if (!res.ok) throw new Error("Failed to load jobs");
            const data = await res.json();
            if (current()) setJobs(id ? [data] : Array.isArray(data) ? data : []);
        } catch (err) {
            if (current()) setError(err instanceof Error ? err.message : "Failed to load jobs");
        } finally {
            if (current()) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const createJob = useCallback(async (input: JobInput): Promise<Job> => {
        const res = await fetch("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to add job");
        setJobs((prev) => [data, ...prev]);
        return data;
    }, []);

    const updateJob = useCallback(
        async (id: string, input: JobInput): Promise<Job> => {
            const res = await fetch(`/api/jobs/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to update job");
            setJobs((prev) => prev.map((j) => (j._id === id ? data : j)));
            return data;
        },
        []
    );

    const deleteJob = useCallback(async (id: string) => {
        const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to delete job");
        }
        setJobs((prev) => prev.filter((j) => j._id !== id));
    }, []);

    return { jobs, loading, error, fetchJobs, createJob, updateJob, deleteJob };
}
