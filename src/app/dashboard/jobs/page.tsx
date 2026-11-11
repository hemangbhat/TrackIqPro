"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useJobs } from "../../../../hooks/useJobs";
import type { JobInput } from "../../../../hooks/useJobs";
import { useUserPlan } from "../../../../components/useUserPlan";
import { useToast } from "../../../../components/ui/Toast";
import JobsToolbar from "../../../../components/JobsToolbar";
import JobTable from "../../../../components/JobTable";
import JobFormDrawer from "../../../../components/JobFormDrawer";
import { ConfirmDelete } from "../../../../components/ui/ConfirmDelete";
import { Button, EmptyState } from "../../../../components/ui/primitives";
import { BriefcaseIcon, PlusIcon, SearchIcon } from "../../../../components/ui/icons";
import { Job } from "../../../../types";
import { FREE_JOB_LIMIT } from "../../../../lib/plans";
import { isAtJobLimit } from "../../../../lib/plan-gate";
import {
    filterAndSortJobs,
    JobSort,
    StageFilter,
} from "../../../../lib/job-filter";

// useSearchParams needs a Suspense boundary in the App Router.
export default function JobsPage() {
    return (
        <Suspense fallback={null}>
            <JobsPageContent />
        </Suspense>
    );
}

function JobsPageContent() {
    const { jobs, loading, error, fetchJobs, createJob, updateJob, deleteJob } =
        useJobs();
    const searchParams = useSearchParams();
    const { plan, isPro } = useUserPlan();
    const toast = useToast();
    const router = useRouter();

    // Single create/edit drawer. `editingJob === null` => create mode.
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<Job | null>(null);

    // Toolbar state (search / stage filter / sort).
    const [query, setQuery] = useState("");
    const [stage, setStage] = useState<StageFilter>("all");
    const [sort, setSort] = useState<JobSort>("recent");

    // Client-side filtered + sorted view over the useJobs() array (no API call).
    const visible = useMemo(
        () => filterAndSortJobs(jobs, { query, stage, sort }),
        [jobs, query, stage, sort]
    );

    // Advisory free-plan gate for creating jobs (Req 4.2). The gate mirrors the
    // server's authoritative free-tier limit and only applies in create mode;
    // editing an existing job is never gated.
    const planGate = {
        atLimit: isAtJobLimit(plan, jobs.length),
        limit: FREE_JOB_LIMIT,
        isPro,
    };

    function openCreate() {
        setEditingJob(null);
        setDrawerOpen(true);
    }

    // Links elsewhere in the app: "Add job" goes to ?new=1 and the header search
    // to ?q=…. Apply them, then drop them from the URL so a reload doesn't repeat.
    useEffect(() => {
        const wantsNew = searchParams?.get("new") === "1";
        const q = searchParams?.get("q") ?? null;
        if (!wantsNew && q === null) return;
        if (wantsNew) openCreate();
        if (q !== null) setQuery(q);
        router.replace("/dashboard/jobs");
    }, [searchParams, router]);

    function openEdit(job: Job) {
        setEditingJob(job);
        setDrawerOpen(true);
    }

    function closeDrawer() {
        setDrawerOpen(false);
        setEditingJob(null);
    }

    // Persist via the useJobs mutations. The drawer shows its own success /
    // error toasts and closes itself on success, so we simply delegate here.
    async function handleSubmit(input: JobInput) {
        if (editingJob) {
            await updateJob(editingJob._id, input);
        } else {
            await createJob(input);
        }
    }

    function handleOpen(id: string) {
        router.push(`/dashboard/jobs/${id}`);
    }

    // The table asks first; the delete itself runs from the confirm dialog.
    const [pendingDelete, setPendingDelete] = useState<Job | null>(null);

    async function handleDelete(id: string) {
        setPendingDelete(null);
        try {
            await deleteJob(id);
            toast.success("Application removed");
        } catch (err) {
            // Identify the failed operation; useJobs preserves the list on failure.
            toast.error(
                err instanceof Error ? err.message : "Failed to delete application"
            );
        }
    }

    // Decide which empty state JobTable should show when `visible` is empty:
    // a no-results state (with result count 0) when a search/filter is active
    // but matches nothing, otherwise the first-run "add your first job" state.
    const hasActiveQueryOrFilter = query.trim() !== "" || stage !== "all";
    const tableEmptyState =
        jobs.length > 0 && hasActiveQueryOrFilter ? (
            <EmptyState
                icon={<SearchIcon />}
                title="No matching applications"
                description="No applications match your search and filter. Try a different term or clear the stage filter."
            />
        ) : (
            <EmptyState
                icon={<BriefcaseIcon />}
                title="No applications yet"
                description="Add your first job application to start tracking your search."
                action={
                    <Button onClick={openCreate}>
                        <PlusIcon size={16} /> Add application
                    </Button>
                }
            />
        );

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Premium hero header with brand glow + eyebrow label. */}
            <div className="relative overflow-hidden rounded-2xl">
                <div className="relative flex flex-wrap items-end justify-between gap-4 p-1 sm:p-2">
                    <div className="min-w-0">
                        <p className="font-bold text-sm text-indigo-500">
                            Pipeline
                        </p>
                        <h1 className="gw-display text-[clamp(2.25rem,4vw,3.5rem)] text-[var(--ink)] mt-1">
                            Job Applications
                        </h1>
                        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                            Tracking {jobs.length}{" "}
                            {jobs.length === 1 ? "opportunity" : "opportunities"} across your pipeline.
                        </p>
                    </div>
                    <Button onClick={openCreate} className="shadow-indigo-500/20">
                        <PlusIcon size={16} /> Add application
                    </Button>
                </div>
            </div>

            <JobsToolbar
                query={query}
                onQueryChange={setQuery}
                stage={stage}
                onStageChange={setStage}
                sort={sort}
                onSortChange={setSort}
                resultCount={visible.length}
            />

            <JobTable
                jobs={visible}
                loading={loading}
                error={error}
                onRetry={fetchJobs}
                onOpen={handleOpen}
                onEdit={openEdit}
                onDelete={(id) => setPendingDelete(jobs.find((j) => j._id === id) ?? null)}
                onAdd={openCreate}
                emptyState={tableEmptyState}
            />

            {/* Unified create/edit drawer wired to useJobs().createJob /
                useJobs().updateJob with the advisory free-limit gate (Req 8, 4.2). */}
            <JobFormDrawer
                open={drawerOpen}
                mode={editingJob ? "edit" : "create"}
                initial={editingJob ?? undefined}
                onClose={closeDrawer}
                onSubmit={handleSubmit}
                planGate={planGate}
            />

            <ConfirmDelete
                title="Delete application?"
                target={pendingDelete ? `${pendingDelete.title} at ${pendingDelete.company}` : null}
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => (pendingDelete ? handleDelete(pendingDelete._id) : undefined)}
            />
        </div>
    );
}
