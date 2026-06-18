"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { useNotes } from "../hooks/useNotes";
import { Badge, Card, EmptyState, ErrorState, Skeleton } from "./ui/primitives";
import { NotesIcon, ArrowRightIcon } from "./ui/icons";

type NotesPanelProps = {
    jobId: string;
};

export default function NotesPanel({ jobId }: NotesPanelProps) {
    const { notes, loading, error, fetchNotes } = useNotes();

    // Load only the notes linked to this job via the existing ?jobId= filter.
    useEffect(() => {
        if (jobId) fetchNotes(jobId);
    }, [jobId, fetchNotes]);

    return (
        <Card className="glass-panel gradient-border p-6">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text)]">Linked notes</h2>
                <Link
                    href="/dashboard/notes"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500 hover:underline"
                >
                    All notes
                    <ArrowRightIcon size={13} />
                </Link>
            </div>

            {error ? (
                <ErrorState
                    title="Couldn't load notes"
                    description="We couldn't load notes for this application."
                    onRetry={() => fetchNotes(jobId)}
                />
            ) : loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                    ))}
                </div>
            ) : notes.length === 0 ? (
                <EmptyState
                    icon={<NotesIcon />}
                    title="No notes yet"
                    description="Notes you link to this application will appear here."
                    action={
                        <Link
                            href="/dashboard/notes"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-500 hover:underline"
                        >
                            Add a note
                            <ArrowRightIcon size={14} />
                        </Link>
                    }
                />
            ) : (
                <ul className="space-y-3">
                    {notes.map((note) => (
                        <li
                            key={note._id}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-[var(--text)]">
                                    {note.title}
                                </h3>
                                {note.round && <Badge tone="neutral">{note.round}</Badge>}
                            </div>
                            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-[var(--text-muted)]">
                                {note.content}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
