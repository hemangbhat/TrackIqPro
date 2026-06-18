"use client";
import { useCallback, useEffect, useState } from "react";
import { Note } from "../types";

export type NoteInput = Partial<Omit<Note, "_id" | "userId" | "createdAt" | "updatedAt">>;

export function useNotes() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotes = useCallback(async (jobId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const url = jobId
                ? `/api/notes?jobId=${encodeURIComponent(jobId)}`
                : "/api/notes";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to load notes");
            const data = await res.json();
            setNotes(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load notes");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const createNote = useCallback(async (input: NoteInput): Promise<Note> => {
        const res = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const data = await res.json();
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
            const data = await res.json();
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
