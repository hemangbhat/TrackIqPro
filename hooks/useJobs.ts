"use client";
import { useCallback, useEffect, useState } from "react";
import { Job } from "../types";

export type JobInput = Partial<Omit<Job, "_id" | "userId">>;

export function useJobs() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/jobs");
            if (!res.ok) throw new Error("Failed to load jobs");
            const data = await res.json();
            setJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load jobs");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const createJob = useCallback(async (input: JobInput): Promise<Job> => {
        const res = await fetch("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const data = await res.json();
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
            const data = await res.json();
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
