"use client";
import React from "react";
import { Job } from "../types";
import { Badge } from "./ui/primitives";
import CompanyLogo from "./CompanyLogo";
import { PencilIcon, TrashIcon, MapPinIcon, WalletIcon, CalendarIcon } from "./ui/icons";

type JobCardProps = {
    job: Job;
    /** Open the job's details page. */
    onOpen?: (id: string) => void;
    /** Open the edit form drawer for this job. */
    onEdit?: (job: Job) => void;
    /** Delete this job (invokes the useJobs mutation in the parent). */
    onDelete?: (id: string) => void;
};

/**
 * Stacked card representation of a single job, used below the `md` breakpoint by
 * `JobTable`. The body is a button that opens the job's details; edit/delete are
 * separate icon buttons so the card has no nested interactive ambiguity.
 *
 * Presentation only — all data mutations are owned by the parent via callbacks.
 */
export default function JobCard({ job, onOpen, onEdit, onDelete }: JobCardProps) {
    return (
        <div className="glass-panel gradient-border flex items-stretch justify-between gap-3 rounded-2xl p-4 transition-colors hover:border-indigo-400/50">
            <button
                type="button"
                onClick={() => onOpen?.(job._id)}
                aria-label={`Open ${job.title} at ${job.company}`}
                className="flex min-w-0 flex-1 items-start gap-3 cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
                <CompanyLogo company={job.company} size="md" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-[var(--text)]">
                            {job.title}
                        </h3>
                        {job.stage && <Badge tone={job.stage}>{job.stage}</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
                        {job.company}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                        {job.location && (
                            <span className="inline-flex items-center gap-1">
                                <MapPinIcon size={13} aria-hidden="true" />
                                {job.location}
                            </span>
                        )}
                        {typeof job.salary === "number" && (
                            <span className="inline-flex items-center gap-1">
                                <WalletIcon size={13} aria-hidden="true" />${job.salary.toLocaleString()}
                            </span>
                        )}
                        {job.dateApplied && (
                            <span className="inline-flex items-center gap-1">
                                <CalendarIcon size={13} aria-hidden="true" />
                                {new Date(job.dateApplied).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            </button>

            <div className="ml-1 flex shrink-0 items-center gap-1">
                {onEdit && (
                    <button
                        type="button"
                        onClick={() => onEdit(job)}
                        aria-label={`Edit ${job.title}`}
                        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                        <PencilIcon size={17} />
                    </button>
                )}
                {onDelete && (
                    <button
                        type="button"
                        onClick={() => onDelete(job._id)}
                        aria-label={`Delete ${job.title}`}
                        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                        <TrashIcon size={17} />
                    </button>
                )}
            </div>
        </div>
    );
}
