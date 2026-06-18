"use client";

import Link from "next/link";
import { useJobs } from "../../../hooks/useJobs";
import { useUserPlan } from "../../../components/useUserPlan";
import {
    getFollowUpSuggestions,
    getKpis,
    getStatusBreakdown,
    getApplicationsOverTime,
    getRecentActivity,
} from "../../../lib/insights";
import { resolveViewState } from "../../../lib/view-state";
import { computeCareerHealth } from "../../../lib/career-health";
import { getPriorityQueue } from "../../../lib/follow-up-intelligence";
import { ScoreRing } from "../../../components/intelligence/ScoreRing";
import StatCard from "../../../components/StatCard";
import ApplicationsChart from "../../../components/ApplicationsChart";
import StatusBreakdown from "../../../components/StatusBreakdown";
import RecentActivity from "../../../components/RecentActivity";
import UpsellCard from "../../../components/UpsellCard";
import { PlanBadge } from "../../../components/PlanBadge";
import {
    Card,
    Skeleton,
    Button,
    Badge,
    EmptyState,
    ErrorState,
} from "../../../components/ui/primitives";
import {
    BriefcaseIcon,
    TrendingUpIcon,
    CalendarIcon,
    TrophyIcon,
    ArrowRightIcon,
    SparklesIcon,
    ActivityIcon,
    FlameIcon,
} from "../../../components/ui/icons";

export default function DashboardHome() {
    const { jobs, loading, error, fetchJobs } = useJobs();
    const { isPro, loading: planLoading } = useUserPlan();

    // Derive exactly one View_State (loading | empty | error | ready) from the
    // jobs Data_Hook so the dashboard presents a single, coherent state and
    // never mixes stale/partial values with an error or empty indication
    // (Requirements 6.4, 6.5; view-state resolver per Requirement 3.6).
    const state = resolveViewState({ loading, error, data: jobs });

    // All dashboard values are derived from the Insights_Engine; the page
    // performs no independent computation (Requirements 6.1, 6.2, 6.3). When
    // there are no jobs these naturally resolve to zero-valued KPIs.
    const kpis = getKpis(jobs);
    const statusData = getStatusBreakdown(jobs);
    const timelineData = getApplicationsOverTime(jobs);
    const recent = getRecentActivity(jobs, 5);
    const suggestions = getFollowUpSuggestions(jobs);

    // Headline Career Intelligence for the ready-state strip (Career Health
    // composite + top follow-up priorities), derived entirely from the
    // intelligence engines.
    const careerHealth = computeCareerHealth(jobs);
    const topPriorities = getPriorityQueue(jobs, 3);

    // Free_User upsell is shown once the plan has resolved to a non-Pro plan
    // (Requirement 6.6). Suppressed in the error state so we don't render a
    // partial dashboard alongside a load failure.
    const showUpsell = !planLoading && !isPro && state !== "error";

    return (
        <div className="relative mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Soft brand glow behind the header for premium depth. */}
            <div className="hero-gradient pointer-events-none absolute inset-x-0 -top-8 h-48" />

            <div className="relative flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                        Dashboard
                    </span>
                    <div className="mt-1 flex items-center gap-3">
                        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
                            Good morning
                        </h1>
                        {/* Plan badge reflecting Free or Pro (Requirement 6.7). */}
                        <PlanBadge />
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Your job search at a glance.
                    </p>
                </div>
                <Link href="/dashboard/jobs">
                    <Button>
                        Add application <ArrowRightIcon size={16} />
                    </Button>
                </Link>
            </div>

            {/* Error: show a load-failure indication and retain the dashboard
                layout (header above) WITHOUT rendering stale or partial KPI,
                chart, or list values (Requirement 6.5). */}
            {state === "error" ? (
                <ErrorState
                    title="Couldn't load your data"
                    description="We couldn't reach the server. Check your connection and try again."
                    onRetry={fetchJobs}
                />
            ) : (
                <>
                    {/* Free_User upsell card (Requirement 6.6). */}
                    {showUpsell && <UpsellCard variant="inline" />}

                    {/* KPI row: total apps, interview rate (0–100%), offers, active
                        (Requirement 6.1). In the empty state each card shows a
                        value of zero from the Insights_Engine (Requirement 6.4). */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {state === "loading" ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-28" />
                            ))
                        ) : (
                            <>
                                <StatCard
                                    label="Total applications"
                                    value={kpis.total}
                                    tone="indigo"
                                    icon={<BriefcaseIcon size={18} />}
                                />
                                <StatCard
                                    label="Interview rate"
                                    value={`${kpis.interviewRate}%`}
                                    tone="emerald"
                                    icon={<CalendarIcon size={18} />}
                                    hint="Reached interview or beyond"
                                />
                                <StatCard
                                    label="Offers"
                                    value={kpis.offers}
                                    tone="amber"
                                    icon={<TrophyIcon size={18} />}
                                />
                                <StatCard
                                    label="Active"
                                    value={kpis.active}
                                    tone="violet"
                                    icon={<TrendingUpIcon size={18} />}
                                    hint="Still in the pipeline"
                                />
                            </>
                        )}
                    </div>

                    {state === "loading" ? (
                        // Loading: skeletons matching the charts + lists layout.
                        <>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Card className="glass-panel gradient-border p-6">
                                    <Skeleton className="mb-4 h-5 w-40" />
                                    <Skeleton className="h-[280px]" />
                                </Card>
                                <Card className="glass-panel gradient-border p-6">
                                    <Skeleton className="mb-4 h-5 w-40" />
                                    <Skeleton className="h-[280px]" />
                                </Card>
                            </div>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {Array.from({ length: 2 }).map((_, c) => (
                                    <Card key={c} className="glass-panel gradient-border p-6">
                                        <Skeleton className="mb-4 h-5 w-40" />
                                        <div className="space-y-2">
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <Skeleton key={i} className="h-12" />
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : state === "empty" ? (
                        // Empty: a single empty-state message stands in for the
                        // charts, recent-activity list, and follow-up list while
                        // the zero-valued KPI cards above remain (Requirement 6.4).
                        <EmptyState
                            icon={<BriefcaseIcon size={24} />}
                            title="No applications yet"
                            description="Add your first job application to see your timeline, stage breakdown, recent activity, and suggested follow-ups here."
                            action={
                                <Link href="/dashboard/jobs">
                                    <Button>
                                        Add your first application{" "}
                                        <ArrowRightIcon size={16} />
                                    </Button>
                                </Link>
                            }
                        />
                    ) : (
                        // Ready: charts and insight lists derived from the
                        // Insights_Engine (Requirements 6.2, 6.3).
                        <>
                            {/* Career Intelligence strip — a compact headline read on
                                career health plus the highest-leverage follow-ups,
                                sourced from the intelligence engines. */}
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                                <Link
                                    href="/dashboard/intelligence"
                                    className="group glass-panel gradient-border flex items-center gap-5 rounded-2xl p-6 transition-colors hover:border-indigo-500/40"
                                >
                                    <ScoreRing
                                        value={careerHealth.score}
                                        size={84}
                                        strokeWidth={8}
                                        sublabel="/ 100"
                                    />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                                                <ActivityIcon size={15} />
                                            </span>
                                            <h2 className="font-display text-base font-semibold text-[var(--text)]">
                                                Career Health
                                            </h2>
                                            <Badge tone="pro">{careerHealth.grade}</Badge>
                                        </div>
                                        <p className="mt-1.5 line-clamp-2 text-sm text-[var(--text-muted)]">
                                            {careerHealth.summary}
                                        </p>
                                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors group-hover:text-indigo-500 dark:text-indigo-300">
                                            View intelligence{" "}
                                            <ArrowRightIcon size={14} />
                                        </span>
                                    </div>
                                </Link>

                                <Card className="glass-panel gradient-border p-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                                            <FlameIcon size={16} />
                                        </span>
                                        <h2 className="font-display text-base font-semibold text-[var(--text)]">
                                            Top priorities
                                        </h2>
                                    </div>
                                    {topPriorities.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-[var(--text-muted)]">
                                            No urgent follow-ups right now. New priorities surface
                                            here as applications go quiet.
                                        </div>
                                    ) : (
                                        <ul className="space-y-2">
                                            {topPriorities.map((p) => (
                                                <li key={p.jobId}>
                                                    <Link
                                                        href={`/dashboard/jobs/${p.jobId}`}
                                                        className="flex items-center justify-between gap-3 rounded-lg p-2.5 transition-colors hover:bg-[var(--surface-2)]"
                                                    >
                                                        <div className="min-w-0">
                                                            <span className="truncate text-sm font-semibold text-[var(--text)]">
                                                                {p.title} · {p.company}
                                                            </span>
                                                            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                                                                {p.action}
                                                            </p>
                                                        </div>
                                                        <Badge
                                                            tone={
                                                                p.impact === "high"
                                                                    ? "rejected"
                                                                    : p.impact === "medium"
                                                                      ? "pending"
                                                                      : "applied"
                                                            }
                                                            className="shrink-0"
                                                        >
                                                            {p.impact}
                                                        </Badge>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Card className="glass-panel gradient-border p-6">
                                    <h2 className="font-display mb-4 text-base font-semibold text-[var(--text)]">
                                        Applications timeline
                                    </h2>
                                    <ApplicationsChart data={timelineData} />
                                </Card>
                                <Card className="glass-panel gradient-border p-6">
                                    <h2 className="font-display mb-4 text-base font-semibold text-[var(--text)]">
                                        Stage breakdown
                                    </h2>
                                    <StatusBreakdown data={statusData} />
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Card className="glass-panel gradient-border p-6">
                                    <h2 className="font-display mb-4 text-base font-semibold text-[var(--text)]">
                                        Recent activity
                                    </h2>
                                    <RecentActivity activities={recent} />
                                </Card>
                                <Card className="glass-panel gradient-border p-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                                            <SparklesIcon size={16} />
                                        </span>
                                        <h2 className="font-display text-base font-semibold text-[var(--text)]">
                                            Suggested follow-ups
                                        </h2>
                                    </div>
                                    {suggestions.length === 0 ? (
                                        <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                                            You&apos;re all caught up. No follow-ups due right now.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {suggestions.map((s) => (
                                                <Link
                                                    key={s.jobId}
                                                    href={`/dashboard/jobs/${s.jobId}`}
                                                    className="flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-[var(--surface-2)]"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="truncate text-sm font-semibold text-[var(--text)]">
                                                                {s.title} · {s.company}
                                                            </span>
                                                            <Badge
                                                                tone={
                                                                    s.severity === "high"
                                                                        ? "rejected"
                                                                        : "pending"
                                                                }
                                                            >
                                                                {s.severity === "high"
                                                                    ? "Overdue"
                                                                    : "Due"}
                                                            </Badge>
                                                        </div>
                                                        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                                                            {s.reason}
                                                        </p>
                                                    </div>
                                                    <ArrowRightIcon
                                                        size={16}
                                                        className="shrink-0 text-[var(--text-muted)]"
                                                    />
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
