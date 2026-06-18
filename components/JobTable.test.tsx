import React from "react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";
import { renderWithTheme, screen } from "../test/render";
import JobTable from "./JobTable";
import { EmptyState } from "./ui/primitives";
import { SearchIcon } from "./ui/icons";
import { Job } from "../types";

/**
 * Task 10.4 — Jobs table responsiveness and mutation-error handling
 * (Requirements 7.6, 7.7, 7.8, 7.11).
 *
 * JobTable renders a dense table inside a `hidden md:block` wrapper (visible at
 * >=768px) and a stacked JobCard list inside a `md:hidden` wrapper (visible
 * below 768px). jsdom does not compute layout, so the breakpoint switch is
 * verified through the presence of those Tailwind class wrappers and the fact
 * that each layout renders the same jobs. The no-results empty state is driven
 * by the parent via the optional `emptyState` prop. Row actions delegate to the
 * onOpen / onEdit / onDelete callbacks. (The edit/delete mutation-failure path,
 * Req 7.11, is exercised at the page level in
 * src/app/dashboard/jobs/page.test.tsx.)
 */

const jobs: Job[] = [
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
    {
        _id: "j2",
        userId: "u1",
        title: "Backend Engineer",
        company: "Globex",
        location: "NYC",
        stage: "applied",
        status: "active",
        salary: 130000,
        dateApplied: "2024-02-01T00:00:00.000Z",
        createdAt: "2024-02-01T00:00:00.000Z",
        updatedAt: "2024-02-01T00:00:00.000Z",
    },
];

function noop() {}

describe("JobTable responsiveness (Req 7.7, 7.8)", () => {
    it("renders the dense table inside a `hidden md:block` wrapper with every job", () => {
        const { container } = renderWithTheme(
            <JobTable
                jobs={jobs}
                loading={false}
                error={null}
                onRetry={noop}
                onOpen={noop}
                onEdit={noop}
                onDelete={noop}
            />
        );

        // The md+ table layout lives inside a `hidden md:block` wrapper.
        const tableWrapper = container.querySelector(".hidden.md\\:block");
        expect(tableWrapper).not.toBeNull();

        // It contains an actual <table> rendering every job.
        const table = tableWrapper!.querySelector("table");
        expect(table).not.toBeNull();
        for (const job of jobs) {
            expect(within(tableWrapper as HTMLElement).getByText(job.title)).toBeInTheDocument();
        }
    });

    it("renders the stacked card list inside a `md:hidden` wrapper with every job", () => {
        const { container } = renderWithTheme(
            <JobTable
                jobs={jobs}
                loading={false}
                error={null}
                onRetry={noop}
                onOpen={noop}
                onEdit={noop}
                onDelete={noop}
            />
        );

        // The mobile card layout lives inside a `md:hidden` wrapper (and is NOT
        // the `hidden md:block` table wrapper).
        const cardWrappers = Array.from(
            container.querySelectorAll(".md\\:hidden")
        ).filter((el) => !el.classList.contains("md:block"));
        expect(cardWrappers.length).toBe(1);

        const cardWrapper = cardWrappers[0] as HTMLElement;
        expect(cardWrapper.querySelector("table")).toBeNull();
        for (const job of jobs) {
            expect(within(cardWrapper).getByText(job.title)).toBeInTheDocument();
        }
    });

    it("renders each job in BOTH layouts so the same set is available at every breakpoint", () => {
        renderWithTheme(
            <JobTable
                jobs={jobs}
                loading={false}
                error={null}
                onRetry={noop}
                onOpen={noop}
                onEdit={noop}
                onDelete={noop}
            />
        );

        // Title appears once in the table and once in the card for each job.
        for (const job of jobs) {
            expect(screen.getAllByText(job.title)).toHaveLength(2);
        }
    });
});

describe("JobTable no-results empty state (Req 7.6)", () => {
    it("renders the provided emptyState when jobs is empty", () => {
        const customEmpty = (
            <EmptyState
                icon={<SearchIcon />}
                title="No matching applications"
                description="No applications match your search and filter."
            />
        );

        renderWithTheme(
            <JobTable
                jobs={[]}
                loading={false}
                error={null}
                onRetry={noop}
                onOpen={noop}
                onEdit={noop}
                onDelete={noop}
                emptyState={customEmpty}
            />
        );

        expect(screen.getByText(/no matching applications/i)).toBeInTheDocument();
        // The default first-run empty state must not be shown.
        expect(screen.queryByText(/no applications yet/i)).toBeNull();
    });

    it("falls back to the default empty state when no emptyState prop is given", () => {
        renderWithTheme(
            <JobTable
                jobs={[]}
                loading={false}
                error={null}
                onRetry={noop}
                onOpen={noop}
                onEdit={noop}
                onDelete={noop}
            />
        );

        expect(screen.getByText(/no applications yet/i)).toBeInTheDocument();
    });
});

describe("JobTable row actions (Req 7.9, 7.10)", () => {
    it("invokes onOpen / onEdit / onDelete when the table row actions are clicked", async () => {
        const user = userEvent.setup();
        const onOpen = vi.fn();
        const onEdit = vi.fn();
        const onDelete = vi.fn();

        const { container } = renderWithTheme(
            <JobTable
                jobs={jobs}
                loading={false}
                error={null}
                onRetry={noop}
                onOpen={onOpen}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        );

        // Scope to the table wrapper so we don't also match the mobile card buttons.
        const tableWrapper = within(
            container.querySelector(".hidden.md\\:block") as HTMLElement
        );

        await user.click(tableWrapper.getByRole("button", { name: /open frontend engineer/i }));
        await user.click(tableWrapper.getByRole("button", { name: /edit frontend engineer/i }));
        await user.click(tableWrapper.getByRole("button", { name: /delete frontend engineer/i }));

        expect(onOpen).toHaveBeenCalledWith("j1");
        expect(onEdit).toHaveBeenCalledWith(jobs[0]);
        expect(onDelete).toHaveBeenCalledWith("j1");
    });
});

describe("JobTable error state (Req 7.11 supporting)", () => {
    it("renders an error state with a retry control bound to onRetry", async () => {
        const user = userEvent.setup();
        const onRetry = vi.fn();

        renderWithTheme(
            <JobTable
                jobs={[]}
                loading={false}
                error="Failed to load jobs"
                onRetry={onRetry}
                onOpen={noop}
                onEdit={noop}
                onDelete={noop}
            />
        );

        expect(screen.getByText(/failed to load jobs/i)).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /retry|try again/i }));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });
});
