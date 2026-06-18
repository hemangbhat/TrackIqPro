"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { utils, writeFile } from "xlsx";
import { useOffers, OfferInput } from "../hooks/useOffers";
import { useToast } from "./ui/Toast";
import { usePlanGate } from "./usePlanGate";
import UpgradePrompt from "./UpgradePrompt";
import {
    Button,
    Skeleton,
    EmptyState,
    ErrorState,
    Badge,
} from "./ui/primitives";
import {
    ScaleIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    TrophyIcon,
    DownloadIcon,
    LockIcon,
    SparklesIcon,
    BuildingIcon,
} from "./ui/icons";
import {
    scoreOffers,
    normalizeWeights,
    defaultWeights,
    Weights,
    ScoredOffer,
} from "../lib/scoring";
import { Offer } from "../types";
import { WeightSliders } from "./WeightSliders";
import { ScoreExplanation } from "./ScoreExplanation";
import { OfferFormDrawer } from "./OfferFormDrawer";
import { useReducedMotion } from "./useReducedMotion";
import { staggerItemPreset } from "./motion";

const WEIGHTS_STORAGE_KEY = "offerWeights";

/**
 * Weights are held on a 0-100 inclusive scale for the sliders. Any persisted
 * value (including the older 0-1 fractional scale) is normalized back onto the
 * 0-100 scale so proportions are preserved without independent scoring math.
 */
function toSliderScale(weights: Weights): Weights {
    const norm = normalizeWeights(weights);
    return {
        salary: Math.round(norm.salary * 100),
        equity: Math.round(norm.equity * 100),
        growth: Math.round(norm.growth * 100),
        brand: Math.round(norm.brand * 100),
    };
}

function loadWeights(): Weights {
    if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(WEIGHTS_STORAGE_KEY);
        if (saved) {
            try {
                return toSliderScale(JSON.parse(saved) as Weights);
            } catch {
                /* ignore malformed storage */
            }
        }
    }
    return toSliderScale(defaultWeights);
}

export default function OfferMatrix() {
    const {
        offers,
        loading,
        error,
        fetchOffers,
        createOffer,
        updateOffer,
        deleteOffer,
    } = useOffers();
    // Export gating is delegated to the centralized Plan_Gate (Req 10.9, 10.10).
    // `exportGate.allowed` mirrors the server's authoritative Pro check; the UI
    // never runs the export for a Free_User and instead surfaces the upgrade
    // prompt, whose CTA navigates to /pricing via `goToPricing`.
    const { isPro, exportGate, goToPricing } = usePlanGate();
    const toast = useToast();
    const reduced = useReducedMotion();

    const [weights, setWeights] = useState<Weights>(() => toSliderScale(defaultWeights));
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editing, setEditing] = useState<Offer | null>(null);
    // Set when a Free_User activates export: the action is blocked and the
    // Plan_Gate upgrade prompt is presented (Req 10.10).
    const [showExportUpgrade, setShowExportUpgrade] = useState(false);

    useEffect(() => setWeights(loadWeights()), []);
    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights));
        }
    }, [weights]);

    // Scores and the best-offer highlight are derived SOLELY from the
    // Scoring_Engine. If it is unavailable/throws, we suppress scores, the
    // highlight, and the explanation while retaining offers + weights inputs.
    const { rows, scoringError } = useMemo<{
        rows: ScoredOffer<Offer>[];
        scoringError: boolean;
    }>(() => {
        try {
            return { rows: scoreOffers(offers, weights), scoringError: false };
        } catch {
            return { rows: [], scoringError: true };
        }
    }, [offers, weights]);

    const best = scoringError ? undefined : rows.find((o) => o.isBest);

    function openCreate() {
        setEditing(null);
        setDrawerOpen(true);
    }

    function openEdit(o: Offer) {
        setEditing(o);
        setDrawerOpen(true);
    }

    async function handleSubmit(input: OfferInput) {
        setSubmitting(true);
        try {
            if (editing?._id) {
                await updateOffer(editing._id, input);
                toast.success("Offer updated");
            } else {
                await createOffer(input);
                toast.success("Offer added");
            }
            setDrawerOpen(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id?: string) {
        if (!id) return;
        try {
            await deleteOffer(id);
            toast.success("Offer removed");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete");
        }
    }

    // Export is Pro-only. The Plan_Gate (lib/plan-gate via usePlanGate) is the
    // single source of the advisory decision. `handleExport` is what the Export
    // button activates: a Free_User is blocked and shown the upgrade prompt
    // (Req 10.10); a Pro_User runs the CSV export as before.
    function handleExport() {
        if (!exportGate.allowed) {
            setShowExportUpgrade(true);
            return;
        }
        exportCSV();
    }

    function exportCSV() {
        if (!exportGate.allowed) return;
        const source: (Offer & { score?: number })[] = scoringError ? offers : rows;
        const exportRows = source.map((o) => ({
            Company: o.company,
            Title: o.title,
            Base: o.salaryBase,
            Bonus: o.bonus || 0,
            Signing: o.signingBonus || 0,
            Equity: o.equity || 0,
            Growth: o.growthScore ?? 0,
            Brand: o.brandScore ?? 0,
            Score: o.score ?? "",
        }));
        const ws = utils.json_to_sheet(exportRows);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Offers");
        writeFile(wb, "trackiq-offers.csv");
        toast.success("Exported offers.csv");
    }

    // When scoring is unavailable we still render the offers (inputs retained),
    // but without scores or the best highlight.
    const tableRows: (Offer & Partial<ScoredOffer<Offer>>)[] = scoringError ? offers : rows;

    return (
        <div className="relative space-y-6">
            {/* Decorative atmosphere */}
            <div
                aria-hidden="true"
                className="accent-orb pointer-events-none absolute -top-24 right-0 h-64 w-64"
            />

            {/* Header */}
            <div className="relative flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                        Decision engine
                    </p>
                    <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">
                        Offer comparison
                    </h1>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Weighted decision engine across your real offers.
                    </p>
                </div>
                <div className="flex gap-2">
                    {isPro ? (
                        <Button
                            variant="secondary"
                            onClick={handleExport}
                            disabled={offers.length === 0}
                        >
                            <DownloadIcon size={16} /> Export CSV
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={handleExport}>
                            <LockIcon size={16} /> Export (Pro)
                        </Button>
                    )}
                    <Button onClick={openCreate}>
                        <PlusIcon size={16} /> Add offer
                    </Button>
                </div>
            </div>

            {/* Plan_Gate upgrade prompt — shown when a Free_User activates the
                gated export action. The export itself is blocked; the CTA
                navigates to /pricing (Req 10.9, 10.10). */}
            {showExportUpgrade && !exportGate.allowed && (
                <UpgradePrompt
                    message={exportGate.message ?? "Exporting is a Pro feature."}
                    onUpgrade={goToPricing}
                />
            )}

            {loading ? (
                <Skeleton className="h-80" />
            ) : error ? (
                <ErrorState
                    title="Couldn't load offers"
                    description="We couldn't reach the server. Check your connection and try again."
                    onRetry={fetchOffers}
                />
            ) : offers.length === 0 ? (
                <EmptyState
                    icon={<ScaleIcon />}
                    title="No offers yet"
                    description="Add at least two offers to compare them with the weighted decision engine."
                    action={
                        <Button onClick={openCreate}>
                            <PlusIcon size={16} /> Add offer
                        </Button>
                    }
                />
            ) : (
                <>
                    {/* Scoring-unavailable indication (suppresses scores/highlight/explanation) */}
                    {scoringError && (
                        <ErrorState
                            title="Scoring unavailable"
                            description="We couldn't compute fit scores right now. Your offers and priority weights are unchanged — try adjusting a weight or reloading."
                        />
                    )}

                    {/* Best-offer highlight — only when scoring succeeded. A premium
                        trophy hero matching the Stitch "Projected Best Value" panel. */}
                    {!scoringError && best && offers.length > 1 && (
                        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.07] p-6">
                            <div
                                aria-hidden="true"
                                className="accent-orb pointer-events-none absolute -right-16 -top-16 h-56 w-56"
                            />
                            <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                                <div className="flex items-start gap-4">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                                        <TrophyIcon />
                                    </span>
                                    <div>
                                        <p className="font-mono-label text-[11px] uppercase text-indigo-500">
                                            Best fit for your weights
                                        </p>
                                        <p className="mt-1 font-display text-xl font-semibold text-[var(--text)]">
                                            {best.company} — {best.title}
                                        </p>
                                    </div>
                                </div>
                                <div className="shrink-0 text-left sm:text-right">
                                    <p className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                        Fit score
                                    </p>
                                    <p className="font-display text-4xl font-bold leading-none text-[var(--text)]">
                                        {best.score}
                                        <span className="ml-1 text-lg font-normal text-indigo-500/70">
                                            /100
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Weight sliders (inputs retained regardless of scoring state) */}
                    <WeightSliders weights={weights} onChange={setWeights} />

                    {/* Score explanation — suppressed when scoring is unavailable */}
                    {!scoringError && (
                        <div className="glass-panel gradient-border rounded-2xl p-5">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="text-indigo-500">
                                    <SparklesIcon size={16} />
                                </span>
                                <p className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                    How scoring works
                                </p>
                            </div>
                            <ScoreExplanation weights={weights} />
                        </div>
                    )}

                    {/* Comparison matrix — dense glass table at >=768px */}
                    <div className="glass-panel gradient-border hidden overflow-hidden rounded-2xl md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/40 text-left">
                                        <th className="px-4 py-3 font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                            Company
                                        </th>
                                        <th className="px-4 py-3 font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                            Cash
                                        </th>
                                        <th className="px-4 py-3 font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                            Equity
                                        </th>
                                        <th className="px-4 py-3 font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                            Growth
                                        </th>
                                        <th className="px-4 py-3 font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                            Brand
                                        </th>
                                        <th className="px-4 py-3 font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                            Fit score
                                        </th>
                                        <th className="px-4 py-3 text-right font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((o, i) => {
                                        const motionProps = staggerItemPreset(reduced, i);
                                        const isBest =
                                            !scoringError && o.isBest && offers.length > 1;
                                        return (
                                            <motion.tr
                                                key={o._id}
                                                initial={motionProps.initial}
                                                animate={motionProps.animate}
                                                transition={motionProps.transition}
                                                className={`border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-2)]/40 ${
                                                    isBest ? "bg-indigo-500/[0.06]" : ""
                                                }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                                                isBest
                                                                    ? "bg-indigo-500/20 text-indigo-500"
                                                                    : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                                                            }`}
                                                        >
                                                            <BuildingIcon size={16} />
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-[var(--text)]">
                                                                    {o.company}
                                                                </span>
                                                                {isBest && (
                                                                    <Badge tone="pro">Best</Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-[var(--text-muted)]">
                                                                {o.title}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-[var(--text)]">
                                                    ${((o.salaryBase || 0) + (o.bonus || 0) + (o.signingBonus || 0)).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-[var(--text)]">
                                                    ${(o.equity || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--text)]">{o.growthScore ?? 0}/10</td>
                                                <td className="px-4 py-3 text-[var(--text)]">{o.brandScore ?? 0}/10</td>
                                                <td className="px-4 py-3">
                                                    {scoringError || o.score == null ? (
                                                        <span className="text-[var(--text-muted)]">—</span>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--surface-2)]">
                                                                <div
                                                                    className={`h-full rounded-full ${
                                                                        isBest
                                                                            ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                                                                            : "bg-indigo-500/70"
                                                                    }`}
                                                                    style={{ width: `${o.score}%` }}
                                                                />
                                                            </div>
                                                            <span className="font-mono font-semibold text-[var(--text)]">
                                                                {o.score}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => openEdit(o)}
                                                            aria-label={`Edit ${o.company} offer`}
                                                            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                                        >
                                                            <PencilIcon size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(o._id)}
                                                            aria-label={`Delete ${o.company} offer`}
                                                            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                                        >
                                                            <TrashIcon size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Stacked one-record cards below 768px (Requirement 15.7) */}
                    <div className="space-y-3 md:hidden">
                        {tableRows.map((o) => {
                            const isBest = !scoringError && o.isBest && offers.length > 1;
                            return (
                                <div
                                    key={o._id}
                                    className={`glass-panel gradient-border rounded-2xl p-4 ${
                                        isBest ? "border-indigo-500/40" : ""
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <span
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                                    isBest
                                                        ? "bg-indigo-500/20 text-indigo-500"
                                                        : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                                                }`}
                                            >
                                                <BuildingIcon size={16} />
                                            </span>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-semibold text-[var(--text)]">
                                                        {o.company}
                                                    </span>
                                                    {isBest && <Badge tone="pro">Best</Badge>}
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    {o.title}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 gap-1">
                                            <button
                                                onClick={() => openEdit(o)}
                                                aria-label={`Edit ${o.company} offer`}
                                                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                            >
                                                <PencilIcon size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(o._id)}
                                                aria-label={`Delete ${o.company} offer`}
                                                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                            >
                                                <TrashIcon size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-[var(--text-muted)]">Cash</dt>
                                            <dd className="font-mono text-[var(--text)]">
                                                ${((o.salaryBase || 0) + (o.bonus || 0) + (o.signingBonus || 0)).toLocaleString()}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-[var(--text-muted)]">Equity</dt>
                                            <dd className="font-mono text-[var(--text)]">
                                                ${(o.equity || 0).toLocaleString()}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-[var(--text-muted)]">Growth</dt>
                                            <dd className="text-[var(--text)]">{o.growthScore ?? 0}/10</dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-[var(--text-muted)]">Brand</dt>
                                            <dd className="text-[var(--text)]">{o.brandScore ?? 0}/10</dd>
                                        </div>
                                    </dl>
                                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                                        <span className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                            Fit score
                                        </span>
                                        {scoringError || o.score == null ? (
                                            <span className="text-[var(--text-muted)]">—</span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--surface-2)]">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            isBest
                                                                ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                                                                : "bg-indigo-500/70"
                                                        }`}
                                                        style={{ width: `${o.score}%` }}
                                                    />
                                                </div>
                                                <span className="font-mono font-semibold text-[var(--text)]">
                                                    {o.score}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Add / edit offer drawer */}
            <OfferFormDrawer
                open={drawerOpen}
                mode={editing ? "edit" : "create"}
                initial={editing ?? undefined}
                submitting={submitting}
                onClose={() => setDrawerOpen(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
