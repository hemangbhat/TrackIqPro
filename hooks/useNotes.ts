"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Note } from "../types";

export type NoteInput = Partial<Omit<Note, "_id" | "userId" | "createdAt" | "updatedAt">>;

/** Notes for the signed-in user; pass `jobId` to load only that job's notes. */
export function useNotes(jobId?: string) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Only the newest request may update state, so a slow earlier response
    // (say, all notes) can't overwrite a newer one (this job's notes).
    const latestRequest = useRef(0);

    const fetchNotes = useCallback(async (forJobId?: string) => {
        const request = ++latestRequest.current;
        setLoading(true);
        setError(null);
        try {
            const url = forJobId
                ? `/api/notes?jobId=${encodeURIComponent(forJobId)}`
                : "/api/notes";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to load notes");
            const data = await res.json();
            if (request !== latestRequest.current) return;
            setNotes(Array.isArray(data) ? data : []);
        } catch (err) {
            if (request !== latestRequest.current) return;
            setError(err instanceof Error ? err.message : "Failed to load notes");
        } finally {
            if (request === latestRequest.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes(jobId);
    }, [fetchNotes, jobId]);

    const createNote = useCallback(async (input: NoteInput): Promise<Note> => {
        const res = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to create note");
        setNotes((prev) => [data, ...prev]);
        return data;
    }, []);

    const updateNote = useCallback(
        async (id: string, input: NoteInput): Promise<Note> => {
            const res = await fetch(`/api/notes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to update note");
            setNotes((prev) => prev.map((n) => (n._id === id ? data : n)));
            return data;
        },
        []
    );

    const deleteNote = useCallback(async (id: string) => {
        const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to delete note");
        }
        setNotes((prev) => prev.filter((n) => n._id !== id));
    }, []);

    return {
        notes,
        loading,
        error,
        fetchNotes,
        createNote,
        updateNote,
        deleteNote,
    };
}
