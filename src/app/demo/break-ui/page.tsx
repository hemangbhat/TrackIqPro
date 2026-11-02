"use client";
// Dev-only stress page: every dashboard component rendered from one dataset,
// switchable with ?data=demo|worst|empty|one|huge. Never served in production.

import React, { useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import DashboardShell from "../../../../components/DashboardShell";
import StatCard from "../../../../components/StatCard";
import JobTable from "../../../../components/JobTable";
import JobHeader from "../../../../components/JobHeader";
import MetadataPanel from "../../../../components/MetadataPanel";
import StageStepper from "../../../../components/StageStepper";
import { NoteGrid } from "../../../../components/NoteGrid";
import OfferMatrix from "../../../../components/OfferMatrix";
import { CareerHealthCard } from "../../../../components/intelligence/CareerHealthCard";
import { PriorityQueue } from "../../../../components/intelligence/PriorityQueue";
import { JobFitList } from "../../../../components/intelligence/JobFitList";
import { OfferIntelligence } from "../../../../components/intelligence/OfferIntelligence";
import { getFixture, type FixtureKind } from "../../../../lib/worst-case-data";
import { computeCareerHealth } from "../../../../lib/career-health";
import { getPriorityQueue } from "../../../../lib/follow-up-intelligence";
import { getKpis } from "../../../../lib/insights";

const KINDS: { value: FixtureKind; label: string }[] = [
    { value: "demo", label: "Demo" },
    { value: "worst", label: "Worst case" },
    { value: "empty", label: "Empty" },
    { value: "one", label: "One" },
    { value: "huge", label: "1,000 rows" },
];

// OfferMatrix loads through useOffers, so its data boundary is the API: answer
// those two requests from the fixture instead of the network.
let stubOffers: unknown[] = [];
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
        if (url.endsWith("/api/offers") && (!init?.method || init.method === "GET")) return json(stubOffers);
        if (url.endsWith("/api/user/plan")) return json({ plan: "pro", customerId: "cus_dev", status: "active", trialEnd: null });
        return realFetch(input, init);
    };
}

const noop = () => {};

export default function BreakUiPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <BreakUi />;
}

function BreakUi() {
    const [kind, setKind] = useState<FixtureKind>("demo");
    // Client-only: fixture dates are relative to "now", so a server render
    // would never match the browser's.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        const q = new URLSearchParams(window.location.search).get("data") as FixtureKind | null;
        if (q && KINDS.some((k) => k.value === q)) setKind(q);
    }, []);

    function choose(next: FixtureKind) {
        setKind(next);
        const url = new URL(window.location.href);
        url.searchParams.set("data", next);
        window.history.replaceState(null, "", url);
    }

    const data = useMemo(() => getFixture(kind), [kind]);
    stubOffers = data.offers;
    const kpis = getKpis(data.jobs);
    const first = data.jobs[0];
    if (!mounted) return null;

    return (
        <DashboardShell>
            <div className="space-y-12 p-4 pb-32 sm:p-6 lg:p-8">
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Applications" value={kpis.total} hint="Total roles tracked" />
                    <StatCard label="Interview rate" value={`${kpis.interviewRate}%`} hint="Reached interview or beyond" />
                    <StatCard label="Offers" value={kpis.offers} hint="Offers + accepted" />
                    <StatCard label="Active" value={kpis.active} hint="Still in the pipeline" />
                </section>

                <section className="grid items-start gap-6 lg:grid-cols-2">
                    <CareerHealthCard health={computeCareerHealth(data.jobs)} />
                    <PriorityQueue items={getPriorityQueue(data.jobs)} linkToJobs={false} />
                </section>

                <JobFitList jobs={data.jobs} profile={data.profile} />

                <JobTable jobs={data.jobs} loading={false} error={null} onRetry={noop} onOpen={noop} onEdit={noop} onDelete={noop} onAdd={noop} />

                {first && (
                    <section className="grid gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            <JobHeader job={first} />
                            <StageStepper current={first.stage} onChange={noop} />
                        </div>
                        <MetadataPanel job={first} />
                    </section>
                )}

                <NoteGrid
                    notes={data.notes}
                    loading={false}
                    error={null}
                    hasNotes={data.notes.length > 0}
                    onOpen={noop}
                    onDelete={noop}
                    onCreate={noop}
                    jobName={(id) => data.jobs.find((j) => j._id === id)?.company ?? null}
                />

                <OfferIntelligence offers={data.offers} />
                <OfferMatrix key={kind} />
            </div>

            <div
                role="radiogroup"
                aria-label="Fixture"
                className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full bg-neutral-200 p-1 font-sans text-xs text-neutral-700 shadow"
                style={{ borderRadius: 9999 }}
            >
                {KINDS.map((k) => (
                    <button
                        key={k.value}
                        type="button"
                        role="radio"
                        aria-checked={kind === k.value}
                        onClick={() => choose(k.value)}
                        style={{ borderRadius: 9999 }}
                        className={"px-3 py-1.5 " + (kind === k.value ? "bg-white text-neutral-900" : "")}
                    >
                        {k.label}
                    </button>
                ))}
            </div>
        </DashboardShell>
    );
}
