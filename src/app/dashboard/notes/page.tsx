"use client";
import { useCallback, useMemo, useState } from "react";
import { useToast } from "../../../../components/ui/Toast";
import { useJobs } from "../../../../hooks/useJobs";
import { useNotes, NoteInput } from "../../../../hooks/useNotes";
import { Button } from "../../../../components/ui/primitives";
import { PlusIcon } from "../../../../components/ui/icons";
import { NotesToolbar } from "../../../../components/NotesToolbar";
import { NoteGrid } from "../../../../components/NoteGrid";
import { NoteEditorDrawer } from "../../../../components/NoteEditorDrawer";
import { Note } from "../../../../types";

export default function NotesPage() {
    const toast = useToast();
    const { jobs } = useJobs();
    const { notes, loading, error, fetchNotes, createNote, updateNote, deleteNote } =
        useNotes();

    // Toolbar state (debounced query is owned here; chip is a single value or null).
    const [query, setQuery] = useState("");
    const [round, setRound] = useState<string | null>(null);

    // Editor drawer state.
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editing, setEditing] = useState<Note | null>(null);

    const jobName = useCallback(
        (jobId?: string | null) => {
            if (!jobId) return null;
            const job = jobs.find((j) => j._id === jobId);
            return job ? `${job.title} · ${job.company}` : null;
        },
        [jobs]
    );

    // Distinct, non-empty round values for the filter chips.
    const rounds = useMemo(() => {
        const set = new Set<string>();
        for (const n of notes) {
            const r = (n.round || "").trim();
            if (r) set.add(r);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [notes]);

    // Client-side search (title/content, case-insensitive substring) + round chip.
    const visible = useMemo(() => {
        let result = notes;
        if (round) result = result.filter((n) => (n.round || "").trim() === round);
        const q = query.trim().toLowerCase();
        if (q) {
            result = result.filter(
                (n) =>
                    n.title.toLowerCase().includes(q) ||
                    n.content.toLowerCase().includes(q)
            );
        }
        return result;
    }, [notes, query, round]);

    function openCreate() {
        setEditing(null);
        setOpen(true);
    }

    function openEdit(note: Note) {
        setEditing(note);
        setOpen(true);
    }

    const handleSubmit = useCallback(
        async (input: NoteInput) => {
            setSubmitting(true);
            try {
                if (editing) {
                    await updateNote(editing._id, input);
                    toast.success("Note updated");
                } else {
                    await createNote(input);
                    toast.success("Note added");
                }
                setOpen(false);
                setEditing(null);
            } catch (err) {
                // Keep the drawer open and retain the user's values on failure.
                toast.error(err instanceof Error ? err.message : "Something went wrong");
            } finally {
                setSubmitting(false);
            }
        },
        [editing, updateNote, createNote, toast]
    );

    const handleDelete = useCallback(
        async (id: string) => {
            try {
                await deleteNote(id);
                toast.success("Note deleted");
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to delete");
            }
        },
        [deleteNote, toast]
    );

    return (
        <div className="relative mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div
                aria-hidden="true"
                className="accent-orb pointer-events-none absolute -top-24 right-0 h-64 w-64"
            />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                        Interview prep
                    </p>
                    <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">
                        Interview notes
                    </h1>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Private notes, linkable to an application and interview round.
                    </p>
                </div>
                <Button onClick={openCreate}>
                    <PlusIcon size={16} /> New note
                </Button>
            </div>

            <NotesToolbar
                query={query}
                onQueryChange={setQuery}
                round={round}
                onRoundChange={setRound}
                rounds={rounds}
                resultCount={visible.length}
            />

            <NoteGrid
                notes={visible}
                loading={loading}
                error={error}
                onRetry={() => fetchNotes()}
                hasNotes={notes.length > 0}
                onOpen={openEdit}
                onDelete={handleDelete}
                onCreate={openCreate}
                jobName={jobName}
            />

            <NoteEditorDrawer
                open={open}
                mode={editing ? "edit" : "create"}
                initial={editing ?? undefined}
                jobs={jobs}
                onClose={() => {
                    setOpen(false);
                    setEditing(null);
                }}
                onSubmit={handleSubmit}
                submitting={submitting}
            />
        </div>
    );
}
