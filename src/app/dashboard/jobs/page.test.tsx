import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen, within, waitFor } from "../../../../test/render";
import { ToastProvider } from "../../../../components/ui/Toast";
import { Job } from "../../../../types";

/**
 * Task 10.4 — Jobs page edit/delete mutation-failure handling
 * (Requirement 7.11).
 *
 * When a useJobs edit or delete mutation fails, the page must display an error
 * indication identifying the failed operation AND preserve the existing job
 * list unchanged. We mock useJobs so deleteJob rejects deterministically; the
 * mock keeps `jobs` populated (mirroring useJobs, which only mutates its state
 * on success), so asserting the row is still present verifies the list is
 * preserved. next/navigation is mocked because the page uses useRouter.
 */

const { jobsData, deleteJob, createJob, updateJob, fetchJobs, push } = vi.hoisted(() => ({
    jobsData: [
        {
            _id: "j1",
            userId: "u1",
            title: "Frontend Engineer",
            company: "Acme Inc.",
            location: "Remote",
            stage: "interview",
            status: "active",
            salary: 120000,
            dateApplied: "2024-01-10T00:00:00.000Z",
            createdAt: "2024-01-10T00:00:00.000Z",
            updatedAt: "2024-01-10T00:00:00.000Z",
        },
    ] as Job[],
    deleteJob: vi.fn(),
    createJob: vi.fn(),
    updateJob: vi.fn(),
    fetchJobs: vi.fn(),
    push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

vi.mock("../../../../hooks/useJobs", () => ({
    useJobs: () => ({
        jobs: jobsData,
        loading: false,
        error: null,
        fetchJobs,
        createJob,
        updateJob,
        deleteJob,
    }),
}));

// The page consumes useUserPlan to compute the advisory free-limit gate for
// the create drawer. Mock it (it otherwise depends on Clerk's <ClerkProvider>).
vi.mock("../../../../components/useUserPlan", () => ({
    useUserPlan: () => ({
        plan: "pro" as const,
        customerId: null,
        status: "active",
        trialEnd: null,
        isPro: true,
        loading: false,
    }),
}));

import JobsPage from "./page";

function renderPage() {
    return renderWithTheme(
        <ToastProvider>
            <JobsPage />
        </ToastProvider>
    );
}

beforeEach(() => {
    deleteJob.mockReset();
    createJob.mockReset();
    updateJob.mockReset();
    fetchJobs.mockReset();
    push.mockReset();
});

describe("Jobs page delete mutation failure (Req 7.11)", () => {
    it("shows an error indication and preserves the existing job list on delete failure", async () => {
        const user = userEvent.setup();
        deleteJob.mockRejectedValue(new Error("Failed to delete job"));
        const { container } = renderPage();

        // The job is shown (table + card layouts each render the title).
        expect(screen.getAllByText("Frontend Engineer").length).toBeGreaterThan(0);

        // Trigger delete from the dense table layout.
        const tableWrapper = within(
            container.querySelector(".hidden.md\\:block") as HTMLElement
        );
        await user.click(
            tableWrapper.getByRole("button", { name: /delete frontend engineer/i })
        );

        // useJobs delete mutation was invoked with the job id.
        expect(deleteJob).toHaveBeenCalledWith("j1");

        // Error indication identifies the failed operation.
        expect(await screen.findByText(/failed to delete job/i)).toBeInTheDocument();

        // The existing job list is preserved unchanged.
        expect(screen.getAllByText("Frontend Engineer").length).toBeGreaterThan(0);
    });

    it("shows a success indication on delete success", async () => {
        const user = userEvent.setup();
        deleteJob.mockResolvedValue(undefined);
        const { container } = renderPage();

        const tableWrapper = within(
            container.querySelector(".hidden.md\\:block") as HTMLElement
        );
        await user.click(
            tableWrapper.getByRole("button", { name: /delete frontend engineer/i })
        );

        expect(deleteJob).toHaveBeenCalledWith("j1");
        expect(await screen.findByText(/application removed/i)).toBeInTheDocument();
    });
});

describe("Jobs page row open action (Req 7.9)", () => {
    it("navigates to the job details page when a row's open action is invoked", async () => {
        const user = userEvent.setup();
        const { container } = renderPage();

        const tableWrapper = within(
            container.querySelector(".hidden.md\\:block") as HTMLElement
        );
        await user.click(
            tableWrapper.getByRole("button", { name: /open frontend engineer/i })
        );

        await waitFor(() =>
            expect(push).toHaveBeenCalledWith("/dashboard/jobs/j1")
        );
    });
});
