"use client";
import React from "react";
import Link from "next/link";
import type { PriorityItem, Impact } from "../../lib/follow-up-intelligence";
import { Card, Badge, EmptyState } from "../ui/primitives";
import { FlameIcon, ArrowRightIcon, CheckIcon } from "../ui/icons";

const IMPACT_TONE: Record<Impact, string> = {
    high: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    medium: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    low: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
};

function QueueRow({ item }: { item: PriorityItem }) {
    return (
        <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 transition-colors hover:border-indigo-500/40">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">
                        {item.title}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                        {item.company} · <Badge tone={item.stage}>{item.stage}</Badge>
                    </p>
                </div>
                <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${IMPACT_TONE[item.impact]}`}
                >
                    {item.impact} · {item.value}
                </span>
            </div>

            <p className="mt-2.5 text-sm font-semibold text-[var(--text)]">{item.action}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{item.why}</p>

            <div className="mt-2.5 flex items-center justify-between gap-3">
                <span className="flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-300">
                    <CheckIcon size={14} className="mt-px shrink-0" />
                    {item.expectedImpact}
                </span>
                <Link
                    href={`/dashboard/jobs/${item.jobId}`}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-300"
                >
                    View job <ArrowRightIcon size={14} />
                </Link>
            </div>
        </li>
    );
}

/**
 * Ranked follow-up priority queue: each item shows its impact badge, transparent
 * value score, the bold action to take, why it matters now, the expected impact,
 * and a link to the underlying job.
 */
export function PriorityQueue({ items }: { items: PriorityItem[] }) {
    return (
        <Card className="glass-panel gradient-border flex h-full flex-col p-6 sm:p-7">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                    <FlameIcon size={20} />
                </span>
                <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--text)]">
                        Priority Queue
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                        Highest-leverage follow-ups first.
                    </p>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="mt-6 flex-1">
                    <EmptyState
                        icon={<CheckIcon size={22} />}
                        title="You're all caught up"
                        description="No follow-ups are overdue right now. New priorities will surface here as your applications go quiet."
                    />
                </div>
            ) : (
                <ul className="mt-6 space-y-3">
                    {items.map((item) => (
                        <QueueRow key={item.jobId} item={item} />
                    ))}
                </ul>
            )}
        </Card>
    );
}
