import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen, waitFor } from "../../../../test/render";
import { ToastProvider } from "../../../../components/ui/Toast";

/**
 * Task 15.2 — Notes mutation toasts and value retention (Requirements 11.9, 11.10).
 *
 * The NotesPage wires the useNotes mutations to toasts:
 *  - success (create/update/delete) -> success toast, drawer closes
 *  - failure (create/update) -> error toast, drawer STAYS OPEN with the user's
 *    unsaved field values retained
 *  - failure (delete) -> error toast
 *
 * The Toast provider auto-dismisses at 4000ms, which is inside the required
 * 3-5s window. We mock the data hooks so we can drive success/failure
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

beforeEach(() => {
  createNote.mockReset();
  updateNote.mockReset();
  deleteNote.mockReset();
  fetchNotes.mockReset();
  notesData = [];
});

async function openCreateAndFill(user: ReturnType<typeof userEvent.setup>) {
  // When there are no notes, a "New note" CTA also appears in the empty state;
  // the header button is the first one.
  await user.click(screen.getAllByRole("button", { name: /new note/i })[0]);
  await screen.findByRole("dialog");
  await user.type(screen.getByLabelText(/title/i), "Phone screen recap");
  await user.type(screen.getByLabelText(/content/i), "Discussed system design.");
}

describe("Notes create mutation (Req 11.9, 11.10)", () => {
  it("shows a success toast and closes the drawer on create success", async () => {
    const user = userEvent.setup();
    createNote.mockResolvedValue({ _id: "n1" });
    renderPage();

    await openCreateAndFill(user);
    await user.click(screen.getByRole("button", { name: /add note/i }));

    expect(createNote).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/note added/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows an error toast and keeps the drawer open with values retained on create failure", async () => {
    const user = userEvent.setup();
    createNote.mockRejectedValue(new Error("Server unavailable"));
    renderPage();

    await openCreateAndFill(user);
    await user.click(screen.getByRole("button", { name: /add note/i }));

    // Error toast is shown.
    expect(await screen.findByText(/server unavailable/i)).toBeInTheDocument();

    // Drawer stays open and the user's unsaved values are retained.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue("Phone screen recap");
    expect(screen.getByLabelText(/content/i)).toHaveValue(
      "Discussed system design."
    );
  });
});

describe("Notes delete mutation (Req 11.9, 11.10)", () => {
  beforeEach(() => {
    notesData = [
      {
        _id: "n1",
        title: "Onsite",
        content: "Whiteboard round",
        round: "Onsite",
        jobId: null,
      },
    ];
  });

  it("shows a success toast on delete success", async () => {
    const user = userEvent.setup();
    deleteNote.mockResolvedValue(undefined);
    renderPage();

    await user.click(screen.getByRole("button", { name: /delete note/i }));

    expect(deleteNote).toHaveBeenCalledWith("n1");
    expect(await screen.findByText(/note deleted/i)).toBeInTheDocument();
  });

  it("shows an error toast on delete failure", async () => {
    const user = userEvent.setup();
    deleteNote.mockRejectedValue(new Error("Could not delete"));
    renderPage();

    await user.click(screen.getByRole("button", { name: /delete note/i }));

    expect(await screen.findByText(/could not delete/i)).toBeInTheDocument();
  });
});
