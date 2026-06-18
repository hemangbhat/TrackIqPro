"use client";
import { useMemo, useRef } from "react";
import { useJobs } from "../../../../hooks/useJobs";
import { useNotes } from "../../../../hooks/useNotes";
import { useCareerProfile } from "../../../../hooks/useCareerProfile";
import { computeCareerHealth } from "../../../../lib/career-health";
import { analyzeReflections } from "../../../../lib/interview-reflection";
import { getPriorityQueue } from "../../../../lib/follow-up-intelligence";
import { Card, Skeleton, ErrorState } from "../../../../components/ui/primitives";
import { CareerHealthCard } from "../../../../components/intelligence/CareerHealthCard";
import { ReflectionPanel } from "../../../../components/intelligence/ReflectionPanel";
import { PriorityQueue } from "../../../../components/intelligence/PriorityQueue";
import { CareerProfileEditor } from "../../../../components/intelligence/CareerProfileEditor";
import { JobFitList } from "../../../../components/intelligence/JobFitList";

function PanelSkeleton({ className }: { className?: string }) {
    return (
        <Card className={`glass-panel gradient-border p-6 sm:p-7 ${className ?? ""}`}>
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                </div>
            </div>
            <div className="mt-6 space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
            </div>
        </Card>
    );
}

export default function IntelligencePage() {
    const {
        jobs,
        loading: jobsLoading,
        error: jobsError,
        fetchJobs,
    } = useJobs();
    const {
        notes,
        loading: notesLoading,
        error: notesError,
        fetchNotes,
    } = useNotes();
    const {
        profile,
        loading: profileLoading,
        error: profileError,
        fetchProfile,
        saveProfile,
    } = useCareerProfile();

    const profileSectionRef = useRef<HTMLDivElement>(null);

    const health = useMemo(() => computeCareerHealth(jobs), [jobs]);
    const reflection = useMemo(() => analyzeReflections(notes), [notes]);
    const priorityItems = useMemo(() => getPriorityQueue(jobs), [jobs]);

    const initialLoading =
        (jobsLoading && jobs.length === 0) ||
        (notesLoading && notes.length === 0) ||
        (profileLoading && profile.skills.length === 0);

    // A hard error only when every data source failed — otherwise sections that
    // do have data still render and per-section emptiness is handled inline.
    const hardError = jobsError && notesError && profileError;

    function retryAll() {
        fetchJobs();
        fetchNotes();
        fetchProfile();
    }

    function focusProfile() {
        profileSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = profileSectionRef.current?.querySelector<HTMLInputElement>("#profile-skills");
        input?.focus();
    }

    return (
        <div className="relative mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Brand glow behind the header for premium depth. */}
            <div
                aria-hidden="true"
                className="hero-gradient pointer-events-none absolute inset-x-0 -top-8 h-56"
            />

            <header className="relative">
                <span className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                    Intelligence
                </span>
                <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
                    Career Intelligence
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
                    Explainable insights across your search — career health, job fit, follow-up
                    priorities, and interview reflection. Every score shows its reasoning.
                </p>
            </header>

            {hardError ? (
                <ErrorState
                    title="Couldn't load your intelligence"
                    description="We couldn't reach your applications, notes, or profile. Check your connection and try again."
                    onRetry={retryAll}
                />
            ) : initialLoading ? (
                <div className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-5">
                        <PanelSkeleton className="lg:col-span-3" />
                        <PanelSkeleton className="lg:col-span-2" />
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <PanelSkeleton />
                        <PanelSkeleton />
                    </div>
                    <PanelSkeleton />
                </div>
            ) : (
                <div className="relative space-y-6">
                    {/* Row 1: Career Health (wide) + Reflection beside it. */}
                    <div className="grid gap-6 lg:grid-cols-5">
                        <div className="lg:col-span-3">
                            {jobsError ? (
                                <ErrorState
                                    title="Couldn't load Career Health"
                                    description="We couldn't load your applications."
                                    onRetry={fetchJobs}
                                />
                            ) : (
                                <CareerHealthCard health={health} />
                            )}
                        </div>
                        <div className="lg:col-span-2">
                            {notesError ? (
                                <ErrorState
                                    title="Couldn't load Reflection"
                                    description="We couldn't load your interview notes."
                                    onRetry={fetchNotes}
                                />
                            ) : (
                                <ReflectionPanel reflection={reflection} />
                            )}
                        </div>
                    </div>

                    {/* Row 2: Priority Queue + Profile editor. */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                            {jobsError ? (
                                <ErrorState
                                    title="Couldn't load Priority Queue"
                                    description="We couldn't load your applications."
                                    onRetry={fetchJobs}
                                />
                            ) : (
                                <PriorityQueue items={priorityItems} />
                            )}
                        </div>
                        <div ref={profileSectionRef}>
                            {profileError ? (
                                <ErrorState
                                    title="Couldn't load your profile"
                                    description="We couldn't load your career profile."
                                    onRetry={fetchProfile}
                                />
                            ) : (
                                <CareerProfileEditor profile={profile} saveProfile={saveProfile} />
                            )}
                        </div>
                    </div>

                    {/* Row 3: Job Fit list, full width. */}
                    <section aria-labelledby="job-fit-heading">
                        <div className="mb-4">
                            <h2
                                id="job-fit-heading"
                                className="font-display text-xl font-semibold tracking-tight text-[var(--text)]"
                            >
                                Job Fit
                            </h2>
                            <p className="text-sm text-[var(--text-muted)]">
                                How each active application matches your profile, with the reasoning behind every score.
                            </p>
                        </div>
                        {jobsError ? (
                            <ErrorState
                                title="Couldn't load Job Fit"
                                description="We couldn't load your applications."
                                onRetry={fetchJobs}
                            />
                        ) : (
                            <JobFitList jobs={jobs} profile={profile} onAddSkills={focusProfile} />
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
