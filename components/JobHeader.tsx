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
        <Card className="pt-6">
            <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
                <div className="flex min-w-0 items-end gap-4">
                    <CompanyLogo
                        company={job.company}
                        size="lg"
                    />
                    <div className="min-w-0 pb-1">
                        <p className="font-bold text-sm text-[var(--text-muted)] [overflow-wrap:anywhere]">
                            {job.company}
                            {job.location ? `, ${job.location}` : ""}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h1 className="gw-display min-w-0 text-[clamp(1.75rem,3vw,2.75rem)] text-[var(--ink)] [overflow-wrap:anywhere]">
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
