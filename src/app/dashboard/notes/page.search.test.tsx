import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen, waitFor } from "../../../../test/render";
import { ToastProvider } from "../../../../components/ui/Toast";

/**
 * Task 15.3 — Notes search / round filtering, no-match empty state, and the
 * update success toast path (Requirements 11.5, 11.7, 11.8, 11.9).
 *
 * Search and round filtering are computed client-side by NotesPage over the
 * array returned by useNotes:
 *  - 11.5: a non-empty query matches notes whose title OR content contains the
 *    query as a case-insensitive substring (debounced ~300ms in NotesToolbar).
 *  - 11.6: empty query + no chip => all notes are shown.
 *  - 11.7: a selected round chip shows only notes whose round equals the chip.
 *  - 11.8: when the active query + chip match zero notes, a no-matches empty
 *    state is shown.
 *
 * Required-field validation (11.4) is covered in
 * components/NoteEditorDrawer.test.tsx, and the create/delete success+error
 * toast paths with value retention (11.9, 11.10) in page.test.tsx; here we add
 * the update success path to round out the mutation-feedback coverage.
 *
 * The data hooks are mocked so filtering and mutation feedback can be driven
 * deterministically without touching the network.
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

function renderPage() {
  return renderWithTheme(
    <ToastProvider>
      <NotesPage />
    </ToastProvider>
  );
}

const searchInput = () =>
  screen.getByRole("searchbox", { name: /search notes/i });

beforeEach(() => {
  createNote.mockReset();
  updateNote.mockReset();
  deleteNote.mockReset();
  fetchNotes.mockReset();
  notesData = [
    {
      _id: "n1",
      title: "Onsite system design",
      content: "Whiteboard scaling discussion",
      round: "Onsite",
      jobId: null,
    },
    {
      _id: "n2",
      title: "Recruiter call",
      content: "Discussed salary expectations",
      round: "Phone screen",
      jobId: null,
    },
    {
      _id: "n3",
      title: "Behavioral prep",
      content: "STAR method examples",
      round: "Onsite",
      jobId: null,
    },
  ];
});

describe("Notes substring search (Req 11.5, 11.6)", () => {
  it("shows all notes when the search input is empty and no chip is selected", () => {
    renderPage();

    expect(screen.getByText("Onsite system design")).toBeInTheDocument();
    expect(screen.getByText("Recruiter call")).toBeInTheDocument();
    expect(screen.getByText("Behavioral prep")).toBeInTheDocument();
  });

  it("matches a substring in the note content", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(searchInput(), "whiteboard");

    // Debounced (~300ms) before the parent filters; wait for it to settle.
    await waitFor(() =>
      expect(screen.queryByText("Recruiter call")).toBeNull()
    );
    expect(screen.getByText("Onsite system design")).toBeInTheDocument();
    expect(screen.queryByText("Behavioral prep")).toBeNull();
  });

  it("matches a substring in the note title", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(searchInput(), "recruiter");

    // Wait for the debounced filter to drop the non-matching notes.
    await waitFor(() =>
      expect(screen.queryByText("Onsite system design")).toBeNull()
    );
    expect(screen.getByText("Recruiter call")).toBeInTheDocument();
    expect(screen.queryByText("Behavioral prep")).toBeNull();
  });

  it("is case-insensitive", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(searchInput(), "SALARY");

    await waitFor(() =>
      expect(screen.queryByText("Onsite system design")).toBeNull()
    );
    expect(screen.getByText("Recruiter call")).toBeInTheDocument();
    expect(screen.queryByText("Behavioral prep")).toBeNull();
  });
});

describe("Notes round filtering (Req 11.7)", () => {
  it("shows only notes whose round equals the selected chip", async () => {
    const user = userEvent.setup();
    renderPage();

    // Chips are derived from distinct round values; pick the "Onsite" chip.
    await user.click(screen.getByRole("button", { name: /^onsite$/i, pressed: false }));

    expect(screen.getByText("Onsite system design")).toBeInTheDocument();
    expect(screen.getByText("Behavioral prep")).toBeInTheDocument();
    expect(screen.queryByText("Recruiter call")).toBeNull();
  });

  it("clears the round filter when 'All' is selected", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^onsite$/i, pressed: false }));
    expect(screen.queryByText("Recruiter call")).toBeNull();

    await user.click(screen.getByRole("button", { name: /^all$/i }));
    expect(screen.getByText("Recruiter call")).toBeInTheDocument();
  });

  it("combines the round chip with the search query", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^onsite$/i, pressed: false }));
    await user.type(searchInput(), "behavioral");

    await waitFor(() =>
      expect(screen.queryByText("Onsite system design")).toBeNull()
    );
    // Matches the query and the round chip.
    expect(screen.getByText("Behavioral prep")).toBeInTheDocument();
    // Different round, excluded by the chip.
    expect(screen.queryByText("Recruiter call")).toBeNull();
  });
});

describe("Notes no-match empty state (Req 11.8)", () => {
  it("shows a no-matches message when the query matches zero notes", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(searchInput(), "nonexistent-term-xyz");

    expect(await screen.findByText(/no matching notes/i)).toBeInTheDocument();
    // None of the underlying notes are rendered.
    expect(screen.queryByText("Onsite system design")).toBeNull();
    expect(screen.queryByText("Recruiter call")).toBeNull();
    expect(screen.queryByText("Behavioral prep")).toBeNull();
  });

  it("shows a no-matches message when the chip + query match zero notes", async () => {
    const user = userEvent.setup();
    renderPage();

    // "Phone screen" round only has the recruiter note; exclude it by query.
    await user.click(
      screen.getByRole("button", { name: /^phone screen$/i, pressed: false })
    );
    await user.type(searchInput(), "whiteboard");

    expect(await screen.findByText(/no matching notes/i)).toBeInTheDocument();
  });
});

describe("Notes update mutation success (Req 11.9)", () => {
  it("shows a success toast and closes the drawer on update success", async () => {
    const user = userEvent.setup();
    updateNote.mockResolvedValue({ _id: "n1" });
    renderPage();

    // Open the editor for an existing note (edit mode).
    await user.click(screen.getAllByRole("button", { name: /edit note/i })[0]);
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/note updated/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
