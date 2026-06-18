"use client";
// components/JobTable.tsx
//
// JobTable / JobCard hybrid for the Jobs list. Renders a dense table at the
// `md` breakpoint and above (>=768px) and stacked JobCards below it, satisfying
// the responsive collapse requirement (7.7, 7.8). Each row/card exposes the
// stage as a Badge plus open / edit / delete actions (7.9, 7.10).
//
// This component owns no data and performs no fetching. It presents the four
// view states (loading / empty / error / ready) for the array it is handed and
// delegates every action to the parent via callbacks. The parent decides which
// empty state to show (no applications vs. no search/filter matches) through the
// optional `emptyState` prop (7.6).
//
// Requirements: 7.6, 7.7, 7.8, 7.9, 7.10, 7.11

import React from "react";
import JobCard from "./JobCard";
import CompanyLogo from "./CompanyLogo";
import { Job } from "../types";
import { Badge, EmptyState, ErrorState, Skeleton, Button } from "./ui/primitives";
import {
    BriefcaseIcon,
    PencilIcon,
    TrashIcon,
    ExternalLinkIcon,
    PlusIcon,
    MapPinIcon,
} from "./ui/icons";

export interface JobTableProps {
    /** Jobs to display (already filtered/sorted by the parent). */
    jobs: Job[];
    loading: boolean;
    error: string | null;
    /** Re-invokes the jobs Data_Hook fetch; bound to the error-state retry. */
    onRetry: () => void;
    /** Navigate to the job's details page. */
    onOpen: (id: string) => void;
    /** Open the job form drawer for editing. */
    onEdit: (job: Job) => void;
    /** Delete the job (invokes the useJobs mutation in the parent). */
    onDelete: (id: string) => void;
    /**
     * Empty-state content rendered when `jobs` is empty (and not loading/error).
     * Lets the parent distinguish "no applications yet" from "no matches".
     */
    emptyState?: React.ReactNode;
    /** Optional CTA used by the default empty state. */
    onAdd?: () => void;
}

function salaryLabel(job: Job): string {
    return typeof job.salary === "number" ? `$${job.salary.toLocaleString()}` : "—";
}

function appliedLabel(job: Job): string {
    const raw = job.dateApplied ?? job.createdAt;
    if (!raw) return "—";
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function JobTable({
    jobs,
    loading,
    error,
    onRetry,
    onOpen,
    onEdit,
    onDelete,
    emptyState,
    onAdd,
}: JobTableProps) {
    // --- error --------------------------------------------------------------
    if (error) {
        return (
            <ErrorState
                title="Couldn't load applications"
                description={error}
                onRetry={onRetry}
            />
        );
    }

    // --- loading ------------------------------------------------------------
    if (loading) {
        return (
            <div>
                {/* Table skeleton at md+ */}
                <div className="hidden md:block">
                    <div className="glass-panel gradient-border overflow-hidden rounded-2xl">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-4 border-b border-[var(--border)]/60 px-5 py-4 last:border-b-0"
                            >
                                <Skeleton className="h-10 w-10 rounded-xl" />
                                <Skeleton className="h-4 flex-1" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-24" />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Card skeleton below md */}
                <div className="space-y-3 md:hidden">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    // --- empty --------------------------------------------------------------
    if (jobs.length === 0) {
        if (emptyState) return <>{emptyState}</>;
        return (
            <EmptyState
                icon={<BriefcaseIcon />}
                title="No applications yet"
                description="Add your first job application to start tracking your search."
                action={
                    onAdd ? (
                        <Button onClick={onAdd}>
                            <PlusIcon size={16} /> Add application
                        </Button>
                    ) : undefined
                }
            />
        );
    }

    // --- ready --------------------------------------------------------------
    return (
        <div>
            {/* Dense table at >= 768px */}
            <div className="hidden md:block">
                <div className="glass-panel gradient-border overflow-hidden rounded-2xl shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/40 font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                <th scope="col" className="px-5 py-3.5 font-medium">
                                    Company &amp; Role
                                </th>
                                <th scope="col" className="px-5 py-3.5 font-medium">
                                    Stage
                                </th>
                                <th scope="col" className="px-5 py-3.5 font-medium">
                                    Location
                                </th>
                                <th scope="col" className="px-5 py-3.5 font-medium">
                                    Salary
                                </th>
                                <th scope="col" className="px-5 py-3.5 font-medium">
                                    Applied
                                </th>
                                <th scope="col" className="px-5 py-3.5 text-right font-medium">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((job) => (
                                <tr
                                    key={job._id}
                                    className="group border-b border-[var(--border)]/60 transition-colors last:border-b-0 hover:bg-indigo-500/5"
                                >
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <CompanyLogo company={job.company} size="sm" />
                                            <div className="min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => onOpen(job._id)}
                                                    className="block max-w-[22ch] truncate cursor-pointer rounded text-left font-semibold text-[var(--text)] transition-colors hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                                >
                                                    {job.title}
                                                </button>
                                                <div className="truncate text-xs text-[var(--text-muted)]">
                                                    {job.company}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {job.stage && <Badge tone={job.stage}>{job.stage}</Badge>}
                                    </td>
                                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                                        {job.location ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                <MapPinIcon size={14} aria-hidden="true" />
                                                {job.location}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                                        {salaryLabel(job)}
                                    </td>
                                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                                        {appliedLabel(job)}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-60 md:group-hover:opacity-100">
                                            <button
                                                type="button"
                                                onClick={() => onOpen(job._id)}
                                                aria-label={`Open ${job.title}`}
                                                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                            >
                                                <ExternalLinkIcon size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onEdit(job)}
                                                aria-label={`Edit ${job.title}`}
                                                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                            >
                                                <PencilIcon size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(job._id)}
                                                aria-label={`Delete ${job.title}`}
                                                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                            >
                                                <TrashIcon size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stacked cards below 768px */}
            <div className="space-y-3 md:hidden">
                {jobs.map((job) => (
                    <JobCard
                        key={job._id}
                        job={job}
                        onOpen={onOpen}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
}
