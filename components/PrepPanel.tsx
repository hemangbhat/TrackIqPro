"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAiStatus } from "../hooks/useAiStatus";
import { useReducedMotion } from "./useReducedMotion";
import { Badge, Button, Card, Input, Spinner } from "./ui/primitives";
import type { Citation, PrepResult } from "../lib/ai-client";

export const DESCRIPTION_ANCHOR_ID = "job-description";

const CONSENT_COPY =
    "Your job descriptions and interview notes will be sent to OpenAI to build your prep. You can turn this off any time.";
const CAP_COPY = "You've used today's 5 preps, resets tomorrow";
const RATE_LIMIT_COPY = "Too many requests. Please wait a moment and try again.";
const GENERIC_ERROR_COPY = "Something went wrong preparing your interview. Please try again.";
const DAILY_LIMIT = 5;
const WAKING_AFTER_MS = 8000;

const chipClass =
    "inline-flex min-h-6 items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-indigo-500 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300";

type PrepError = { message: string; retryable: boolean };

/* ------------------------------ Citations ------------------------------ */

function CitationChip({
    citation,
    currentJobId,
    plain,
}: {
    citation: Citation;
    currentJobId?: string;
    plain: boolean;
}) {
    const reduceMotion = useReducedMotion();

    // Demo sample: ids point at demo data that has no real page behind it.
    if (plain) {
        return <span className={chipClass.replace("hover:underline", "")}>{citation.title}</span>;
    }

    if (citation.sourceType === "note") {
        return (
            <Link href={`/dashboard/notes/${citation.sourceId}`} className={chipClass}>
                {citation.title}
            </Link>
        );
    }

    if (citation.jobId === currentJobId) {
        return (
            <a
                href={`#${DESCRIPTION_ANCHOR_ID}`}
                className={chipClass}
                onClick={(e) => {
                    const target = document.getElementById(DESCRIPTION_ANCHOR_ID);
                    if (!target) return; // fall back to the plain hash jump
                    e.preventDefault();
                    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
                }}
            >
                {citation.title}
            </a>
        );
    }

    return (
        <Link href={`/dashboard/jobs/${citation.jobId}`} className={chipClass}>
            {citation.title}
        </Link>
    );
}

function Citations({
    citations,
    currentJobId,
    plain,
}: {
    citations: Citation[];
    currentJobId?: string;
    plain: boolean;
}) {
    if (citations.length === 0) return null;
    return (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">Based on</span>
            {citations.map((c, i) => (
                <CitationChip key={`${c.sourceType}-${c.sourceId}-${i}`} citation={c} currentJobId={currentJobId} plain={plain} />
            ))}
        </div>
    );
}

/* ------------------------------- Result -------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mt-5">
            <h3 className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">{title}</h3>
            <ul className="mt-2 space-y-3">{children}</ul>
        </section>
    );
}

function ItemCard({ children }: { children: React.ReactNode }) {
    return <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">{children}</li>;
}

function PrepResultView({
    result,
    currentJobId,
    plain,
}: {
    result: PrepResult;
    currentJobId?: string;
    plain: boolean;
}) {
    if (result.insufficientData) {
        return <p className="mt-4 text-sm text-[var(--text-muted)]">{result.message}</p>;
    }
    const shared = { currentJobId, plain };
    return (
        <div>
            <Section title="Likely questions">
                {result.likelyQuestions.map((q, i) => (
                    <ItemCard key={i}>
                        <p className="text-sm font-semibold text-[var(--text)]">{q.question}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{q.why}</p>
                        <Citations citations={q.citations} {...shared} />
                    </ItemCard>
                ))}
            </Section>
            <Section title="Weak spots">
                {result.weakSpots.map((w, i) => (
                    <ItemCard key={i}>
                        <p className="text-sm font-semibold text-[var(--text)]">{w.topic}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{w.detail}</p>
                        <Citations citations={w.citations} {...shared} />
                    </ItemCard>
                ))}
            </Section>
            <Section title="Study plan">
                {result.studyPlan.map((s, i) => (
                    <ItemCard key={i}>
                        <p className="text-sm text-[var(--text)]">{s.item}</p>
                        <Citations citations={s.citations} {...shared} />
                    </ItemCard>
                ))}
            </Section>
        </div>
    );
}

/* -------------------------------- Panel -------------------------------- */

function PanelShell({ children, badge }: { children: React.ReactNode; badge?: React.ReactNode }) {
    return (
        <Card className="glass-panel gradient-border p-6">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--text)]">Interview prep</h2>
                {badge}
            </div>
            {children}
        </Card>
    );
}

function LivePrepPanel({ jobId }: { jobId: string }) {
    const { status, loading, enableError, busy, setEnabled } = useAiStatus();
    const [focus, setFocus] = useState("");
    const [requesting, setRequesting] = useState(false);
    const [waking, setWaking] = useState(false);
    const [result, setResult] = useState<PrepResult | null>(null);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [error, setError] = useState<PrepError | null>(null);
    const wakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearWakeTimer = () => {
        if (wakeTimer.current) clearTimeout(wakeTimer.current);
        wakeTimer.current = null;
    };
    useEffect(() => clearWakeTimer, []);

    async function runPrep() {
        setRequesting(true);
        setWaking(false);
        setError(null);
        clearWakeTimer();
        wakeTimer.current = setTimeout(() => setWaking(true), WAKING_AFTER_MS);
        try {
            const res = await fetch("/api/ai/prep", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId, focus: focus.trim() || undefined }),
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok) {
                setResult(body.result as PrepResult);
                setRemaining(body.remaining);
            } else if (res.status === 429) {
                // Daily cap and per-minute rate limit share a status; the body tells them apart.
                const isCap = body?.error === CAP_COPY;
                setError({ message: isCap ? CAP_COPY : RATE_LIMIT_COPY, retryable: false });
                if (isCap) setRemaining(0);
            } else if (res.status === 503) {
                setError({ message: body?.error || GENERIC_ERROR_COPY, retryable: true });
            } else {
                setError({ message: body?.error || GENERIC_ERROR_COPY, retryable: false });
            }
        } catch {
            setError({ message: GENERIC_ERROR_COPY, retryable: true });
        } finally {
            clearWakeTimer();
            setRequesting(false);
            setWaking(false);
        }
    }

    if (loading || !status || !status.configured) return null;

    if (!status.enabled) {
        return (
            <PanelShell>
                <p className="mt-3 text-sm text-[var(--text-muted)]">{CONSENT_COPY}</p>
                {enableError && (
                    <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
                        {enableError}
                    </p>
                )}
                <div className="mt-4">
                    <Button onClick={() => void setEnabled(true)} loading={busy}>
                        Turn on AI prep
                    </Button>
                </div>
            </PanelShell>
        );
    }

    const left = remaining ?? status.remaining;
    const capped = left <= 0;

    return (
        <PanelShell badge={<Badge tone="pro">AI</Badge>}>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                    <label htmlFor={`prep-focus-${jobId}`} className="sr-only">
                        Prep focus (optional)
                    </label>
                    <Input
                        id={`prep-focus-${jobId}`}
                        value={focus}
                        maxLength={200}
                        placeholder="e.g. system design round"
                        onChange={(e) => setFocus(e.target.value)}
                        disabled={requesting}
                    />
                </div>
                <Button onClick={() => void runPrep()} disabled={requesting || capped}>
                    Prep for this interview
                </Button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
                {left} of {DAILY_LIMIT} preps left today
            </p>

            <div aria-live="polite">
                {requesting && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <Spinner size={16} />
                        {waking ? "Waking up the AI service…" : "Preparing…"}
                    </p>
                )}
                {error && (
                    <div className="mt-4">
                        <p className="text-sm text-rose-600 dark:text-rose-400">{error.message}</p>
                        {error.retryable && (
                            <div className="mt-2">
                                <Button variant="secondary" size="sm" onClick={() => void runPrep()}>
                                    Try again
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {result && !requesting && <PrepResultView result={result} currentJobId={jobId} plain={false} />}
        </PanelShell>
    );
}

export default function PrepPanel({ jobId, sample }: { jobId?: string; sample?: PrepResult }) {
    if (sample) {
        return (
            <PanelShell badge={<Badge tone="neutral">Sample</Badge>}>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Sample — sign up to prep with your own notes</p>
                <PrepResultView result={sample} plain />
            </PanelShell>
        );
    }
    if (!jobId) return null;
    return <LivePrepPanel jobId={jobId} />;
}
