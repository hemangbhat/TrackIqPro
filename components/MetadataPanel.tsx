"use client";
import React from "react";
import { Job } from "../types";
import { Badge, Card } from "./ui/primitives";
import { formatDate, formatMoney } from "../lib/format";
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
        <div className="flex items-start gap-3 py-3">
            <span className="mt-0.5 flex shrink-0 text-[var(--ink-muted)]" aria-hidden>
                {icon}
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                <dt className="shrink-0 font-bold text-sm text-[var(--text-muted)]">
                    {label}
                </dt>
                <dd className="min-w-0 text-right text-sm font-medium text-[var(--text)] [overflow-wrap:anywhere]">
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
                    {formatMoney(job.salary)}
                </Row>
                <Row icon={<CalendarIcon size={18} />} label="Status">
                    <Badge tone={job.status === "active" ? "applied" : "withdrawn"}>
                        {job.status}
                    </Badge>
                </Row>
                <Row icon={<LinkIcon size={18} />} label="Link">
                    {/* http(s) only, so a stored javascript: URL (saved before the
                        server-side check existed) can never become a clickable link. */}
                    {job.link && /^https?:\/\//i.test(job.link) ? (
                        <a
                            href={job.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-[var(--ultra-text)] underline-offset-4 hover:underline"
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
                <div id="job-description" className="mt-4 scroll-mt-24 border-t border-[var(--border)] pt-4">
                    <h3 className="font-bold mb-1.5 text-sm text-[var(--text-muted)]">
                        Job description
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                        {job.jobDescription}
                    </p>
                </div>
            )}

            {/* The ids above and below are scroll targets for AI prep citations (PrepPanel). */}
            {job.notes && (
                <div id="job-notes" className="mt-4 scroll-mt-24 border-t border-[var(--border)] pt-4">
                    <h3 className="font-bold mb-1.5 text-sm text-[var(--text-muted)]">
                        Notes
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                        {job.notes}
                    </p>
                </div>
            )}
        </Card>
    );
}
