"use client";
import React from "react";
import { Job } from "../types";
import { Badge, Card } from "./ui/primitives";
import {
    ExternalLinkIcon,
    LinkIcon,
    WalletIcon,
    MapPinIcon,
    CalendarIcon,
    ClockIcon,
} from "./ui/icons";

type MetadataPanelProps = {
    job: Job;
};

function formatDate(value?: Date | string) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function Row({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-indigo-500">
                {icon}
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                <dt className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                    {label}
                </dt>
                <dd className="truncate text-right text-sm font-medium text-[var(--text)]">
                    {children}
                </dd>
            </div>
        </div>
    );
}

export default function MetadataPanel({ job }: MetadataPanelProps) {
    return (
        <Card className="glass-panel gradient-border p-6">
            <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">Details</h2>
            <dl className="divide-y divide-[var(--border)]/60">
                <Row icon={<MapPinIcon size={18} />} label="Location">
                    {job.location || "—"}
                </Row>
                <Row icon={<WalletIcon size={18} />} label="Salary">
                    {typeof job.salary === "number" ? `$${job.salary.toLocaleString()}` : "—"}
                </Row>
                <Row icon={<CalendarIcon size={18} />} label="Status">
                    <Badge tone={job.status === "active" ? "applied" : "withdrawn"}>
                        {job.status}
                    </Badge>
                </Row>
                <Row icon={<LinkIcon size={18} />} label="Link">
                    {job.link ? (
                        <a
                            href={job.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-500 hover:underline"
                        >
                            View posting
                            <ExternalLinkIcon size={14} />
                        </a>
                    ) : (
                        "—"
                    )}
                </Row>
                <Row icon={<CalendarIcon size={18} />} label="Date applied">
                    {formatDate(job.dateApplied)}
                </Row>
                <Row icon={<ClockIcon size={18} />} label="Last updated">
                    {formatDate(job.updatedAt)}
                </Row>
            </dl>

            {job.jobDescription && (
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <h3 className="mb-1.5 font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                        Job description
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                        {job.jobDescription}
                    </p>
                </div>
            )}
        </Card>
    );
}
