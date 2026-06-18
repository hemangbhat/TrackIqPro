"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useJobs } from "../../../../../hooks/useJobs";
import { useToast } from "../../../../../components/ui/Toast";
import { Button, Skeleton } from "../../../../../components/ui/primitives";
import { Modal } from "../../../../../components/ui/Modal";
import {
    ArrowRightIcon,
    PencilIcon,
    TrashIcon,
} from "../../../../../components/ui/icons";
import JobHeader from "../../../../../components/JobHeader";
import JobFormDrawer from "../../../../../components/JobFormDrawer";
import StageStepper from "../../../../../components/StageStepper";
import MetadataPanel from "../../../../../components/MetadataPanel";
import NotesPanel from "../../../../../components/NotesPanel";
import FollowUpPanel from "../../../../../components/FollowUpPanel";
import RelatedOffers from "../../../../../components/RelatedOffers";
import { Job } from "../../../../../types";
import type { JobInput } from "../../../../../hooks/useJobs";

export default function JobDetailsPage() {
    const params = useParams<{ id?: string }>();
    const id = params?.id;
    const toast = useToast();
    const router = useRouter();

    const { jobs, loading, error, updateJob, deleteJob } = useJobs();

    // The current job is derived from the jobs hook array.
    const job = id ? jobs.find((j) => j._id === id) : undefined;

    // Optimistic stage shown while an update is in flight; cleared on settle so
    // the value falls back to the (authoritative) job stage from the hook.
    const [pendingStage, setPendingStage] = useState<Job["stage"] | null>(null);
    const [updatingStage, setUpdatingStage] = useState(false);

    // Edit drawer + delete confirmation state.
    const [editOpen, setEditOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    // True once a delete has succeeded and we are navigating away. Prevents the
    // not-found state from flashing when the job leaves the hook array (Req 9.7).
    const [navigatingAway, setNavigatingAway] = useState(false);

    async function handleStageChange(next: Job["stage"]) {
        if (!job || next === job.stage) return;
        const prev = job.stage;
        setPendingStage(next); // optimistic
        setUpdatingStage(true);
        try {
            await updateJob(job._id, { stage: next });
            setPendingStage(null);
            toast.success(`Stage updated to ${next}`);
        } catch (err) {
            // On failure retain the prior stage and surface an error.
            setPendingStage(null);
            void prev;
            toast.error(
                err instanceof Error ? err.message : "Couldn't update the stage. Please try again."
            );
        } finally {
            setUpdatingStage(false);
        }
    }

    // Edit: persist via useJobs().updateJob. The drawer shows its own success /
    // error toasts and closes itself on success (Req 9.4).
    async function handleEditSubmit(input: JobInput) {
        if (!job) return;
        await updateJob(job._id, input);
    }

    // Delete: only invoked after explicit confirmation (Req 9.4). On success we
    // navigate away from the details page (Req 9.7).
    async function handleConfirmDelete() {
        if (!job || deleting) return;
        setDeleting(true);
        try {
            await deleteJob(job._id);
            setNavigatingAway(true);
            setConfirmDeleteOpen(false);
            toast.success("Application deleted.");
            router.push("/dashboard/jobs");
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Couldn't delete the application. Please try again."
            );
            setDeleting(false);
        }
    }

    const breadcrumb = (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Link href="/dashboard/jobs" className="hover:text-[var(--text)]">
                Applications
            </Link>
            <ArrowRightIcon size={14} />
            <span className="text-[var(--text)]">Details</span>
        </div>
    );

    // While loading (job not yet retrieved) or while navigating away after a
    // successful delete, show the skeleton rather than a not-found error. This
    // distinguishes "still loading" from a genuine fetch error / missing job so
    // not-found is only shown once loading completes (Req 9.5).
    if (loading || navigatingAway) {
        return (
            <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
                {breadcrumb}
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
                <div className="grid gap-6 lg:grid-cols-2">
                    <Skeleton className="h-64 rounded-2xl" />
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
            </div>
        );
    }

    // Loading is complete. If the fetch failed or the requested job does not
    // exist, show a load error and do NOT render the six panels (Req 9.5).
    if (error || !job) {
        return (
            <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
                {breadcrumb}
                <div className="glass-panel rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
                    <p className="text-sm text-[var(--text)]">
                        {error
                            ? "We couldn't load this application."
                            : "This application could not be found."}
                    </p>
                    <Link href="/dashboard/jobs" className="mt-4 inline-block">
                        <Button variant="secondary">Back to applications</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const displayStage = pendingStage ?? job.stage;

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
            {breadcrumb}

            <JobHeader
                job={job}
                actions={
                    <>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditOpen(true)}
                        >
                            <PencilIcon size={16} />
                            Edit
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setConfirmDeleteOpen(true)}
                        >
                            <TrashIcon size={16} />
                            Delete
                        </Button>
                    </>
                }
            />

            <StageStepper
                current={displayStage}
                onChange={handleStageChange}
                disabled={updatingStage}
            />

            <div className="grid gap-6 lg:grid-cols-2">
                <MetadataPanel job={job} />
                <NotesPanel jobId={job._id} />
                <FollowUpPanel job={job} />
                <RelatedOffers job={job} />
            </div>

            {/* Edit drawer — wired to useJobs().updateJob (Req 9.4). */}
            <JobFormDrawer
                open={editOpen}
                mode="edit"
                initial={job}
                onClose={() => setEditOpen(false)}
                onSubmit={handleEditSubmit}
            />

            {/* Explicit delete confirmation (Req 9.4); confirm deletes + navigates
                away (Req 9.7). */}
            <Modal
                open={confirmDeleteOpen}
                onClose={() => {
                    if (!deleting) setConfirmDeleteOpen(false);
                }}
                title="Delete application?"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setConfirmDeleteOpen(false)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmDelete}
                            loading={deleting}
                        >
                            Delete
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-[var(--text-muted)]">
                    This will permanently delete{" "}
                    <span className="font-semibold text-[var(--text)]">
                        {job.title}
                    </span>{" "}
                    at{" "}
                    <span className="font-semibold text-[var(--text)]">
                        {job.company}
                    </span>
                    . This action cannot be undone.
                </p>
            </Modal>
        </div>
    );
}
