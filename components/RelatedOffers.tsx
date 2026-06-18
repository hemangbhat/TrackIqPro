"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import { Job } from "../types";
import { useOffers } from "../hooks/useOffers";
import { Badge, Card, EmptyState, ErrorState, Skeleton } from "./ui/primitives";
import { ScaleIcon, ArrowRightIcon } from "./ui/icons";

type RelatedOffersProps = {
    job: Job;
};

export default function RelatedOffers({ job }: RelatedOffersProps) {
    const { offers, loading, error, fetchOffers } = useOffers();

    // Relate offers to this job by matching company name (case-insensitive),
    // a presentation-layer derivation over the offers hook array.
    const related = useMemo(() => {
        const company = (job.company || "").trim().toLowerCase();
        if (!company) return [];
        return offers.filter((o) => (o.company || "").trim().toLowerCase() === company);
    }, [offers, job.company]);

    return (
        <Card className="glass-panel gradient-border p-6">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text)]">Related offers</h2>
                <Link
                    href="/dashboard/offers"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500 hover:underline"
                >
                    Compare offers
                    <ArrowRightIcon size={13} />
                </Link>
            </div>

            {error ? (
                <ErrorState
                    title="Couldn't load offers"
                    description="We couldn't load related offers."
                    onRetry={fetchOffers}
                />
            ) : loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                    ))}
                </div>
            ) : related.length === 0 ? (
                <EmptyState
                    icon={<ScaleIcon />}
                    title="No related offers"
                    description={`No offers logged for ${job.company} yet.`}
                />
            ) : (
                <ul className="space-y-3">
                    {related.map((offer) => (
                        <li
                            key={offer._id || offer.offerId}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-sm font-semibold text-[var(--text)]">
                                        {offer.title}
                                    </h3>
                                    <Badge tone={offer.status}>{offer.status}</Badge>
                                </div>
                                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                    {offer.company}
                                </p>
                            </div>
                            <span className="shrink-0 text-sm font-medium text-[var(--text)]">
                                ${offer.salaryBase.toLocaleString()}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
