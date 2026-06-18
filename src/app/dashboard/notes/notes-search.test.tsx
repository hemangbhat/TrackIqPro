import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen, waitFor } from "../../../../test/render";
import { ToastProvider } from "../../../../components/ui/Toast";

/**
 * Task 15.3 — Notes search and round filtering (Requirements 11.5, 11.7, 11.8).
 *
 * The NotesPage performs client-side filtering over the array returned by
 * useNotes:
 *  - case-insensitive substring search across title AND content (Req 11.5),
 *    debounced ~300ms by NotesToolbar,
 *  - exact round filtering via the round chips (Req 11.7), and
 *  - a distinct "no matching notes" empty state when search/filter matches
 *    zero notes while notes still exist (Req 11.8).
 *
 * We mock the data hooks so the visible notes are deterministic and no network
 * is involved. Search debounce is observed with waitFor (real timers).
 */

const { createNote, updateNote, deleteNote, fetchNotes } = vi.hoisted(() => ({
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    fetchNotes: vi.fn(),
}));

let notesData: Array<Record<string, unknown>> = [];

vi.mock("../../../../hooks/useNotes", () => ({
    useNotes: () => ({
        notes: notesData,
        loading: false,
        error: null,
        fetchNotes,
        createNote,
        updateNote,
        deleteNote,
    }),
}));

vi.mock("../../../../hooks/useJobs", () => ({
    useJobs: () => ({ jobs: [], loading: false, error: null }),
}));

import NotesPage from "./page";

const NOW = new Date("2024-01-01T00:00:00.000Z").toISOString();

function renderPage() {
    return renderWithTheme(
        <ToastProvider>
            <NotesPage />
        </ToastProvider>
    );
}

beforeEach(() => {
    createNote.mockReset();
    updateNote.mockReset();
    deleteNote.mockReset();
    fetchNotes.mockReset();

    // Three notes spanning two rounds with distinct title/content text.
    notesData = [
        {
            _id: "n1",
            title: "Phone screen recap",
            content: "Discussed REST APIs and pagination.",
            round: "Phone screen",
            jobId: null,
            createdAt: NOW,
            updatedAt: NOW,
        },
        {
            _id: "n2",
            title: "Onsite debrief",
            content: "System design round went well.",
            round: "Onsite",
            jobId: null,
            createdAt: NOW,
            updatedAt: NOW,
        },
        {
            _id: "n3",
            title: "Recruiter chat",
            content: "Salary expectations and timeline.",
            round: "Phone screen",
            jobId: null,
            createdAt: NOW,
            updatedAt: NOW,
        },
    ];
});

const searchBox = () =>
    screen.getByRole("searchbox", { name: /search notes/i });

const noteTitle = (text: string) =>
    screen.queryByRole("button", { name: text });

describe("Notes substring search (Req 11.5)", () => {
    it("filters the grid by a case-insensitive substring of the content", async () => {
        const user = userEvent.setup();
        renderPage();

        // All three notes are visible initially.
        expect(noteTitle("Phone screen recap")).toBeInTheDocument();
        expect(noteTitle("Onsite debrief")).toBeInTheDocument();
        expect(noteTitle("Recruiter chat")).toBeInTheDocument();

        // "system" appears only in n2's content; search is case-insensitive.
        await user.type(searchBox(), "SYSTEM");

        await waitFor(() =>
            expect(noteTitle("Phone screen recap")).toBeNull()
        );
        expect(noteTitle("Recruiter chat")).toBeNull();
        expect(noteTitle("Onsite debrief")).toBeInTheDocument();
    });

    it("filters the grid by a substring of the title", async () => {
        const user = userEvent.setup();
        renderPage();

        await user.type(searchBox(), "recap");

        await waitFor(() => expect(noteTitle("Onsite debrief")).toBeNull());
        expect(noteTitle("Recruiter chat")).toBeNull();
        expect(noteTitle("Phone screen recap")).toBeInTheDocument();
    });
});

describe("Notes round filtering (Req 11.7)", () => {
    it("shows only notes matching the selected round chip", async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole("button", { name: "Onsite" }));

        await waitFor(() =>
            expect(noteTitle("Phone screen recap")).toBeNull()
        );
        expect(noteTitle("Recruiter chat")).toBeNull();
        expect(noteTitle("Onsite debrief")).toBeInTheDocument();
    });

    it("keeps every note sharing the selected round", async () => {
        const user = userEvent.setup();
        renderPage();

        // Two notes share the "Phone screen" round.
        await user.click(
            screen.getByRole("button", { name: "Phone screen" })
        );

        await waitFor(() => expect(noteTitle("Onsite debrief")).toBeNull());
        expect(noteTitle("Phone screen recap")).toBeInTheDocument();
        expect(noteTitle("Recruiter chat")).toBeInTheDocument();
    });
});

describe("Notes no-match empty state (Req 11.8)", () => {
    it("shows the no-matching-notes empty state when a search matches nothing", async () => {
        const user = userEvent.setup();
        renderPage();

        await user.type(searchBox(), "zzz-nonexistent-term");

        expect(await screen.findByText(/no matching notes/i)).toBeInTheDocument();
        // None of the note titles remain.
        expect(noteTitle("Phone screen recap")).toBeNull();
        expect(noteTitle("Onsite debrief")).toBeNull();
        expect(noteTitle("Recruiter chat")).toBeNull();

        // This is distinct from the "no notes yet" empty state, which only
        // shows when there are zero notes at all.
        expect(screen.queryByText(/no notes yet/i)).toBeNull();
    });
});
