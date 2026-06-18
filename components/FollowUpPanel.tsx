"use client";
import React from "react";
import { Job } from "../types";
import { getFollowUpSuggestions } from "../lib/insights";
import { Badge, Card } from "./ui/primitives";
import { CheckIcon, CalendarIcon } from "./ui/icons";

type FollowUpPanelProps = {
    job: Job;
};

export default function FollowUpPanel({ job }: FollowUpPanelProps) {
    // Derive follow-up guidance for this single job from the Insights_Engine.
    const suggestions = getFollowUpSuggestions([job]);

    return (
        <Card className="glass-panel gradient-border p-6">
            <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Follow-up</h2>

            {suggestions.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                        <CheckIcon size={18} />
                    </span>
                    <p className="text-sm text-[var(--text)]">
                        No follow-up needed right now. You&apos;re on track.
                    </p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {suggestions.map((s) => (
                        <li
                            key={s.jobId}
                            className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                                <CalendarIcon size={18} />
                            </span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge tone={s.severity === "high" ? "rejected" : "pending"}>
                                        {s.severity === "high" ? "Urgent" : "Soon"}
                                    </Badge>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {s.daysStale} days
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-[var(--text)]">{s.reason}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
