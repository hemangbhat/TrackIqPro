"use client";
import React from "react";
import { Job } from "../types";
import { Badge, Card } from "./ui/primitives";
import CompanyLogo from "./CompanyLogo";

type JobHeaderProps = {
    job: Job;
    /** Optional action slot (edit/delete controls wired in task 12.2). */
    actions?: React.ReactNode;
};

export default function JobHeader({ job, actions }: JobHeaderProps) {
    return (
        <Card className="glass-panel gradient-border overflow-hidden p-0">
            {/* Brand banner with soft indigo glow. */}
            <div className="relative h-20 bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent sm:h-24">
                <div className="hero-gradient pointer-events-none absolute inset-0" aria-hidden="true" />
            </div>
            <div className="relative -mt-10 flex flex-wrap items-end justify-between gap-4 px-6 pb-6 sm:px-8 sm:pb-7">
                <div className="flex min-w-0 items-end gap-4">
                    <CompanyLogo
                        company={job.company}
                        size="lg"
                        className="shadow-lg ring-4 ring-[var(--surface)]"
                    />
                    <div className="min-w-0 pb-1">
                        <p className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                            {job.company}
                            {job.location ? ` · ${job.location}` : ""}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h1 className="font-display truncate text-2xl font-bold tracking-tight text-[var(--text)]">
                                {job.title}
                            </h1>
                            <Badge tone={job.stage}>{job.stage}</Badge>
                        </div>
                    </div>
                </div>
                {actions && (
                    <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>
                )}
            </div>
        </Card>
    );
}
