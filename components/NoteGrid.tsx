"use client";
import React from "react";
import { motion } from "framer-motion";
import {
    Badge,
    Button,
    EmptyState,
    ErrorState,
    Skeleton,
} from "./ui/primitives";
import {
    NotesIcon,
    SearchIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    LinkIcon,
    ClockIcon,
} from "./ui/icons";
import { Note } from "../types";
import { useReducedMotion } from "./useReducedMotion";
import { staggerItemPreset } from "./motion";

interface NoteGridProps {
    /** Notes to render (already filtered by search + round chip). */
    notes: Note[];
    /** Whether the data hook is loading. */
    loading: boolean;
    /** Error message from the data hook, or null. */
    error: string | null;
    /** Re-invokes the data hook fetch. */
    onRetry?: () => void;
    /**
     * True when there are zero notes at all (before search/filter). Used to
     * distinguish the "no notes yet" empty state from the "no matches" state.
     */
    hasNotes: boolean;
    onOpen: (note: Note) => void;
    onDelete: (id: string) => void;
    /** Opens the editor in create mode (empty-state primary CTA). */
    onCreate: () => void;
    /** Resolves a linked job id to a display label, or null. */
    jobName?: (jobId?: string | null) => string | null;
}

/**
 * NoteGrid renders the notes as readable cards and owns the data view states:
 * loading (skeletons), error (retry), empty (no notes / no matches), and ready.
 * Exactly one state is presented at a time (Requirement 3.x), and the
 * no-matches empty state satisfies Requirement 11.8.
 */
export function NoteGrid({
    notes,
    loading,
    error,
    onRetry,
    hasNotes,
    onOpen,
    onDelete,
    onCreate,
    jobName,
}: NoteGridProps) {
    const reduced = useReducedMotion();
    if (error) {
        return (
            <ErrorState
                title="Couldn't load notes"
                description="We couldn't reach the server. Check your connection and try again."
                onRetry={onRetry}
            />
        );
    }

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-44" />
                ))}
            </div>
        );
    }

    if (notes.length === 0) {
        return hasNotes ? (
            <EmptyState
                icon={<SearchIcon />}
                title="No matching notes"
                description="No notes match your current search or filter. Try a different term or clear the filter."
            />
        ) : (
            <EmptyState
                icon={<NotesIcon />}
                title="No notes yet"
                description="Capture interview reflections, recruiter conversations, and prep notes."
                action={
                    <Button onClick={onCreate}>
                        <PlusIcon size={16} /> New note
                    </Button>
                }
            />
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {notes.map((note, idx) => {
                const linked = jobName?.(note.jobId) ?? null;
                const motionProps = staggerItemPreset(reduced, idx);
                return (
                    <motion.div
                        key={note._id}
                        initial={motionProps.initial}
                        animate={motionProps.animate}
                        transition={motionProps.transition}
                    >
                        <div className="glass-panel gradient-border group relative flex h-full flex-col rounded-2xl p-5 transition-colors hover:border-indigo-400/50">
                            {/* Accent rail echoing the Stitch active-note marker */}
                            <span
                                aria-hidden="true"
                                className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-indigo-500/0 transition-colors group-hover:bg-indigo-500/60"
                            />
                            <div className="flex items-start justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => onOpen(note)}
                                    className="cursor-pointer rounded text-left font-display text-base font-semibold text-[var(--text)] transition-colors hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                                >
                                    {note.title}
                                </button>
                                <div className="flex shrink-0 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onOpen(note)}
                                        aria-label="Edit note"
                                        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    >
                                        <PencilIcon size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(note._id)}
                                        aria-label="Delete note"
                                        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                    >
                                        <TrashIcon size={16} />
                                    </button>
                                </div>
                            </div>
                            {(note.round || linked) && (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                    {note.round && <Badge tone="violet">{note.round}</Badge>}
                                    {linked && (
                                        <Badge tone="neutral">
                                            <LinkIcon size={11} aria-hidden="true" />
                                            <span className="ml-1">{linked}</span>
                                        </Badge>
                                    )}
                                </div>
                            )}
                            <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">
                                {note.content}
                            </p>
                            <p className="mt-4 flex items-center gap-1.5 border-t border-[var(--border)]/60 pt-3 font-mono-label text-[11px] uppercase text-[var(--text-muted)]/80">
                                <ClockIcon size={12} aria-hidden="true" />
                                {new Date(note.updatedAt || note.createdAt).toLocaleString()}
                            </p>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
