"use client";
import React, { useEffect, useRef, useState } from "react";
import { Drawer } from "./ui/Drawer";
import { Button, Field, Input, Select, Textarea } from "./ui/primitives";
import { Job, Note } from "../types";
import { NoteInput } from "../hooks/useNotes";

interface NoteEditorDrawerProps {
    open: boolean;
    mode: "create" | "edit";
    initial?: Partial<Note>;
    /** Jobs for the optional "linked job" selector (from useJobs). */
    jobs: Job[];
    onClose: () => void;
    /**
     * Persists the note. Should reject on failure so the drawer can stay open
     * and retain values. Toast/value-retention wiring lives in the parent.
     */
    onSubmit: (input: NoteInput) => Promise<void>;
    submitting?: boolean;
}

type FormErrors = { title?: string; content?: string };

const emptyForm = { title: "", content: "", jobId: "", round: "" };

/**
 * NoteEditorDrawer is the create/edit form for a note.
 *
 * Fields: title (required), linked job (optional), round (optional),
 * content (required) — Requirement 11.3.
 *
 * If title or content is empty on save, the save is blocked, an inline
 * validation message identifies the missing field, focus moves to the first
 * invalid input, and `onSubmit` is NOT invoked — Requirements 11.4, 15.8.
 */
export function NoteEditorDrawer({
    open,
    mode,
    initial,
    jobs,
    onClose,
    onSubmit,
    submitting = false,
}: NoteEditorDrawerProps) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState<FormErrors>({});

    const titleRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLTextAreaElement>(null);

    // Seed the form when the drawer opens. We intentionally key only on `open`
    // so that a failed save does not wipe the user's in-progress edits.
    useEffect(() => {
        if (!open) return;
        setForm({
            title: initial?.title ?? "",
            content: initial?.content ?? "",
            jobId: initial?.jobId ?? "",
            round: initial?.round ?? "",
        });
        setErrors({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function validate(): FormErrors {
        const next: FormErrors = {};
        if (!form.title.trim()) next.title = "Title is required.";
        if (!form.content.trim()) next.content = "Content is required.";
        return next;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const validation = validate();
        if (Object.keys(validation).length > 0) {
            setErrors(validation);
            // Move focus to the first invalid input.
            if (validation.title) titleRef.current?.focus();
            else if (validation.content) contentRef.current?.focus();
            return; // Block the save; do NOT call onSubmit.
        }
        setErrors({});
        await onSubmit({
            title: form.title.trim(),
            content: form.content.trim(),
            jobId: form.jobId || null,
            round: form.round.trim() || undefined,
        });
    }

    const titleId = "note-title";
    const jobId = "note-linked-job";
    const roundId = "note-round";
    const contentId = "note-content";

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={mode === "edit" ? "Edit note" : "New note"}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="note-editor-form" loading={submitting}>
                        {mode === "edit" ? "Save changes" : "Add note"}
                    </Button>
                </>
            }
        >
            <form
                id="note-editor-form"
                onSubmit={handleSubmit}
                noValidate
                className="space-y-6"
            >
                <fieldset className="space-y-4">
                    <legend className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                        Note
                    </legend>
                    <Field label="Title" htmlFor={titleId} error={errors.title}>
                        <Input
                            id={titleId}
                            ref={titleRef}
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Onsite — system design"
                        />
                    </Field>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field
                            label="Linked job"
                            htmlFor={jobId}
                            hint="Optional"
                        >
                            <Select
                                id={jobId}
                                value={form.jobId}
                                onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                            >
                                <option value="">None</option>
                                {jobs.map((j) => (
                                    <option key={j._id} value={j._id}>
                                        {j.title} · {j.company}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Round" htmlFor={roundId} hint="Optional">
                            <Input
                                id={roundId}
                                value={form.round}
                                onChange={(e) => setForm((f) => ({ ...f, round: e.target.value }))}
                                placeholder="Phone screen, Onsite…"
                            />
                        </Field>
                    </div>

                    <Field label="Content" htmlFor={contentId} error={errors.content}>
                        <Textarea
                            id={contentId}
                            ref={contentRef}
                            className="min-h-40"
                            value={form.content}
                            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                            placeholder="What went well, what to improve, questions asked…"
                        />
                    </Field>
                </fieldset>
            </form>
        </Drawer>
    );
}
