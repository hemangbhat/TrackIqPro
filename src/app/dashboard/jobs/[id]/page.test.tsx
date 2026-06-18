import React from "react";
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    vi,
} from "vitest";
import userEvent from "@testing-library/user-event";
import {
    renderWithTheme,
    screen,
    within,
    waitFor,
} from "../../../../../test/render";
import { ToastProvider } from "../../../../../components/ui/Toast";
import type { Job, Note, Offer } from "../../../../../types";

/**
 * Unit tests for the Job Details page panels and actions (Task 12.3).
 *
 * Covers:
 *   - Renders the six detail panels for an existing job (Req 9.1).
 *   - Linked-notes empty state when useNotes returns no notes (Req 9.3).
 *   - Stage-update failure rollback: updateJob rejects -> prior stage retained
 *     and an error is surfaced (Req 9.6).
 *   - Delete requires explicit confirmation, then calls deleteJob and navigates
 *     to /dashboard/jobs (Req 9.7).
 *   - Not-found / error: once loading completes and the job is missing or an
 *     error is set, a load error is shown and the six panels are NOT rendered
 *     (Req 9.5).
 *
 * The page is rendered inside the real ToastProvider so toast paths are
 * exercised end-to-end. next/navigation and the data hooks (useJobs / useNotes
 * / useOffers) are mocked so each test can drive the page's data states.
 */

// Hoisted mock handles so the vi.mock factories below can reference them.
const h = vi.hoisted(() => ({
    useJobsMock: vi.fn(),
    useNotesMock: vi.fn(),
    useOffersMock: vi.fn(),
    pushMock: vi.fn(),
    params: { value: { id: "j1" } as { id?: string } },
}));

vi.mock("next/navigation", () => ({
    useParams: () => h.params.value,
    useRouter: () => ({ push: h.pushMock }),
}));

vi.mock("../../../../../hooks/useJobs", () => ({
    useJobs: () => h.useJobsMock(),
}));

vi.mock("../../../../../hooks/useNotes", () => ({
    useNotes: () => h.useNotesMock(),
}));

vi.mock("../../../../../hooks/useOffers", () => ({
    useOffers: () => h.useOffersMock(),
}));

import JobDetailsPage from "./page";

/**
 * jsdom does not compute layout, so `HTMLElement.offsetParent` is always null.
 * The Modal/Drawer focus handling filters candidates by visibility via
 * `offsetParent`; shim it so attached elements report a truthy offsetParent.
 */
let originalOffsetParent: PropertyDescriptor | undefined;

beforeAll(() => {
    originalOffsetParent = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        "offsetParent"
    );
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
        configurable: true,
        get(this: HTMLElement) {
            return this.parentNode ?? null;
        },
    });
});

afterAll(() => {
    if (originalOffsetParent) {
        Object.defineProperty(
            HTMLElement.prototype,
            "offsetParent",
            originalOffsetParent
        );
    } else {
        // @ts-expect-error - remove the shim if there was no original descriptor.
        delete HTMLElement.prototype.offsetParent;
    }
});

function makeJob(overrides: Partial<Job> = {}): Job {
    return {
        _id: "j1",
        userId: "u1",
        title: "Senior Engineer",
        company: "Acme Corp",
        location: "Remote",
        stage: "applied",
        status: "active",
        salary: 150000,
        link: "https://example.com/job",
        dateApplied: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        ...overrides,
    };
}

type JobsHookOverrides = {
    jobs?: Job[];
    loading?: boolean;
    error?: string | null;
    updateJob?: ReturnType<typeof vi.fn>;
    deleteJob?: ReturnType<typeof vi.fn>;
};

function setJobsHook(overrides: JobsHookOverrides = {}) {
    const updateJob =
        overrides.updateJob ?? vi.fn().mockResolvedValue(makeJob());
    const deleteJob =
        overrides.deleteJob ?? vi.fn().mockResolvedValue(undefined);
    h.useJobsMock.mockReturnValue({
        jobs: overrides.jobs ?? [makeJob()],
        loading: overrides.loading ?? false,
        error: overrides.error ?? null,
        fetchJobs: vi.fn(),
        createJob: vi.fn(),
        updateJob,
        deleteJob,
    });
    return { updateJob, deleteJob };
}

function setNotesHook(notes: Note[] = [], loading = false, error: string | null = null) {
    h.useNotesMock.mockReturnValue({
        notes,
        loading,
        error,
        fetchNotes: vi.fn(),
        createNote: vi.fn(),
        updateNote: vi.fn(),
        deleteNote: vi.fn(),
    });
}

function setOffersHook(offers: Offer[] = [], loading = false, error: string | null = null) {
    h.useOffersMock.mockReturnValue({
        offers,
        loading,
        error,
        fetchOffers: vi.fn(),
        createOffer: vi.fn(),
        updateOffer: vi.fn(),
        deleteOffer: vi.fn(),
    });
}

function renderPage() {
    return renderWithTheme(
        <ToastProvider>
            <JobDetailsPage />
        </ToastProvider>
    );
}

beforeEach(() => {
    h.pushMock.mockClear();
    h.params.value = { id: "j1" };
    // Sensible defaults: an existing job, no notes, no offers, all loaded.
    setJobsHook();
    setNotesHook();
    setOffersHook();
});

describe("JobDetailsPage", () => {
    describe("panel rendering (Req 9.1)", () => {
        it("renders the six detail panels for an existing job", () => {
            renderPage();

            // Job header shows the role title.
            expect(
                screen.getByRole("heading", { name: /senior engineer/i })
            ).toBeInTheDocument();

            // The six panels by their section headings.
            expect(screen.getByRole("heading", { name: "Stage" })).toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
            expect(
                screen.getByRole("heading", { name: "Linked notes" })
            ).toBeInTheDocument();
            expect(
                screen.getByRole("heading", { name: "Follow-up" })
            ).toBeInTheDocument();
            expect(
                screen.getByRole("heading", { name: "Related offers" })
            ).toBeInTheDocument();
        });
    });

    describe("linked-notes empty state (Req 9.3)", () => {
        it("shows the no-notes empty state when useNotes returns no notes", () => {
            setNotesHook([]);
            renderPage();

            expect(screen.getByText("No notes yet")).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Notes you link to this application will appear here."
                )
            ).toBeInTheDocument();
        });
    });

    describe("stage-update failure rollback (Req 9.6)", () => {
        it("retains the prior stage and surfaces an error when updateJob rejects", async () => {
            const user = userEvent.setup();
            const updateJob = vi.fn().mockRejectedValue(new Error("Update failed"));
            setJobsHook({ jobs: [makeJob({ stage: "applied" })], updateJob });
            renderPage();

            // Prior stage "applied" is the current step.
            expect(
                screen.getByRole("button", { name: "Set stage to Applied" })
            ).toHaveAttribute("aria-current", "step");

            await user.click(
                screen.getByRole("button", { name: "Set stage to Interview" })
            );

            // The update was attempted with the newly selected stage.
            await waitFor(() =>
                expect(updateJob).toHaveBeenCalledWith("j1", { stage: "interview" })
            );

            // An error is surfaced via toast.
            expect(await screen.findByText("Update failed")).toBeInTheDocument();

            // The prior stage is retained: "Applied" remains current, "Interview" is not.
            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: "Set stage to Applied" })
                ).toHaveAttribute("aria-current", "step");
            });
            expect(
                screen.getByRole("button", { name: "Set stage to Interview" })
            ).not.toHaveAttribute("aria-current");
        });
    });

    describe("delete confirmation and navigation (Req 9.7)", () => {
        it("requires explicit confirmation, then deletes and navigates away", async () => {
            const user = userEvent.setup();
            const deleteJob = vi.fn().mockResolvedValue(undefined);
            setJobsHook({ deleteJob });
            renderPage();

            // Activating the header delete action only opens the confirmation
            // dialog; it must NOT delete yet (explicit confirmation required).
            await user.click(screen.getByRole("button", { name: /delete/i }));
            expect(deleteJob).not.toHaveBeenCalled();

            const dialog = screen.getByRole("dialog");
            expect(
                within(dialog).getByText("Delete application?")
            ).toBeInTheDocument();

            // Confirm deletion from within the dialog.
            await user.click(
                within(dialog).getByRole("button", { name: /^delete$/i })
            );

            await waitFor(() => expect(deleteJob).toHaveBeenCalledWith("j1"));
            await waitFor(() =>
                expect(h.pushMock).toHaveBeenCalledWith("/dashboard/jobs")
            );
        });

        it("does not delete when the confirmation is cancelled", async () => {
            const user = userEvent.setup();
            const deleteJob = vi.fn().mockResolvedValue(undefined);
            setJobsHook({ deleteJob });
            renderPage();

            await user.click(screen.getByRole("button", { name: /delete/i }));
            const dialog = screen.getByRole("dialog");
            await user.click(
                within(dialog).getByRole("button", { name: /cancel/i })
            );

            expect(deleteJob).not.toHaveBeenCalled();
            expect(h.pushMock).not.toHaveBeenCalled();
        });
    });

    describe("not-found / load error (Req 9.5)", () => {
        it("shows a not-found error and no panels when the job is missing", () => {
            setJobsHook({ jobs: [], loading: false, error: null });
            renderPage();

            expect(
                screen.getByText("This application could not be found.")
            ).toBeInTheDocument();

            // None of the six panels render.
            expect(
                screen.queryByRole("heading", { name: "Stage" })
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole("heading", { name: "Details" })
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole("heading", { name: "Linked notes" })
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole("heading", { name: /senior engineer/i })
            ).not.toBeInTheDocument();
        });

        it("shows a load error and no panels when the hook reports an error", () => {
            setJobsHook({ jobs: [], loading: false, error: "boom" });
            renderPage();

            expect(
                screen.getByText("We couldn't load this application.")
            ).toBeInTheDocument();

            expect(
                screen.queryByRole("heading", { name: "Stage" })
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole("heading", { name: "Related offers" })
            ).not.toBeInTheDocument();
        });
    });
});
