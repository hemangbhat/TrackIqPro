"use client";
import { useEffect, useRef, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useUserPlan } from "../../../../components/useUserPlan";
import UpgradePrompt from "../../../../components/UpgradePrompt";
import { useToast } from "../../../../components/ui/Toast";
import { Card, Badge, Skeleton, Button } from "../../../../components/ui/primitives";
import {
    DownloadIcon,
    CreditCardIcon,
    SunIcon,
    MoonIcon,
    LockIcon,
    UserIcon,
    PaletteIcon,
    ShieldIcon,
    AlertTriangleIcon,
    SparklesIcon,
} from "../../../../components/ui/icons";
import { FREE_JOB_LIMIT } from "../../../../lib/plans";
import { gateExport } from "../../../../lib/plan-gate";
import { useAiStatus } from "../../../../hooks/useAiStatus";

/**
 * Section wrapper giving every settings block a consistent icon-led heading +
 * anchor. Rendered as a premium glass-panel card with a hairline gradient
 * border. The `<section id aria-labelledby>` structure is preserved exactly so
 * the six settings anchors stay intact (Req 13.1).
 */
function Section({
    id,
    icon,
    title,
    description,
    action,
    children,
}: {
    id: string;
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <Card className="glass-panel gradient-border p-6 sm:p-7">
            <section id={id} aria-labelledby={`${id}-heading`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                            {icon}
                        </span>
                        <div>
                            <h2
                                id={`${id}-heading`}
                                className="font-display text-lg font-semibold tracking-tight text-[var(--text)]"
                            >
                                {title}
                            </h2>
                            {description && (
                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
                <div className="mt-5 sm:pl-14">{children}</div>
            </section>
        </Card>
    );
}

/**
 * Appearance theme selector. Offers an explicit Light and Dark option with
 * exactly one selected at any time (Req 13.2), applying + persisting the
 * selection via the existing next-themes engine (Req 13.3).
 */
function ThemeSelector() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Default to light before the preference is known (Req 2.7) so exactly one
    // option is always selected and SSR/client first render agree.
    const current = mounted && resolvedTheme === "dark" ? "dark" : "light";

    const options = [
        { value: "light" as const, label: "Light", icon: <SunIcon size={16} /> },
        { value: "dark" as const, label: "Dark", icon: <MoonIcon size={16} /> },
    ];

    return (
        <div
            role="group"
            aria-label="Theme"
            className="inline-flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1"
        >
            {options.map((opt) => {
                const selected = current === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setTheme(opt.value)}
                        className={
                            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 " +
                            (selected
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-[var(--text-muted)] hover:text-[var(--text)]")
                        }
                        suppressHydrationWarning
                    >
                        {opt.icon}
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Opt-in switch for the AI interview-prep copilot. Hidden entirely when the AI
 * service is not configured. Turning it off deletes the user's indexed notes
 * from the AI service, so it asks for an inline confirmation first.
 */
function AiPrepToggle() {
    const { status, loading, enableError, busy, setEnabled } = useAiStatus();
    const [confirmingOff, setConfirmingOff] = useState(false);

    if (loading || !status?.configured) return null;

    async function turnOff() {
        if (await setEnabled(false)) setConfirmingOff(false);
    }

    return (
        <Section
            id="ai-prep"
            icon={<SparklesIcon size={20} />}
            title="AI interview prep"
            description="Get likely questions, weak spots, and a study plan drawn from your own notes."
        >
            <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                <span id="ai-prep-label" className="text-sm font-medium text-[var(--text)]">
                    AI interview prep
                </span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={status.enabled}
                    aria-labelledby="ai-prep-label"
                    disabled={busy}
                    onClick={() => {
                        if (status.enabled) setConfirmingOff(true);
                        else void setEnabled(true);
                    }}
                    className={
                        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 " +
                        (status.enabled ? "bg-indigo-600" : "bg-slate-400/60")
                    }
                >
                    <span
                        aria-hidden
                        className={
                            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform " +
                            (status.enabled ? "translate-x-6" : "translate-x-1")
                        }
                    />
                </button>
            </div>

            {!status.enabled && (
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                    Your job descriptions and interview notes will be sent to OpenAI to build your
                    prep. You can turn this off any time.
                </p>
            )}

            {confirmingOff && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                        This deletes your indexed notes from the AI service.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="danger" size="sm" onClick={() => void turnOff()} loading={busy}>
                            Confirm
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfirmingOff(false)}
                            disabled={busy}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {enableError && (
                <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
                    {enableError}
                </p>
            )}
        </Section>
    );
}

export default function SettingsPage() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const { plan, status, isPro, loading } = useUserPlan();
    const toast = useToast();
    const [exporting, setExporting] = useState(false);
    const [billingLoading, setBillingLoading] = useState(false);
    const billingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (billingTimerRef.current) clearTimeout(billingTimerRef.current);
        };
    }, []);

    // Advisory Plan_Gate: export is Pro-only (Req 13.7).
    const exportGate = gateExport(plan);

    async function handleExport() {
        // Gate is advisory; never initiate export for a Free_User (Req 13.7).
        if (!exportGate.allowed) return;
        setExporting(true);
        try {
            const [jobsRes, offersRes, notesRes] = await Promise.all([
                fetch("/api/jobs"),
                fetch("/api/offers"),
                fetch("/api/notes"),
            ]);
            if (!jobsRes.ok || !offersRes.ok || !notesRes.ok) {
                throw new Error("Export failed");
            }
            const data = {
                exportedAt: new Date().toISOString(),
                jobs: await jobsRes.json(),
                offers: await offersRes.json(),
                notes: await notesRes.json(),
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "trackiq-export.json";
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Exported your data");
        } catch {
            toast.error("Could not export your data");
        } finally {
            setExporting(false);
        }
    }

    /**
     * Open the Stripe billing portal using the existing flow. If the portal
     * does not open within 5 seconds, show an error and keep the user on
     * settings with no plan change (Req 13.6).
     */
    async function handleManageBilling() {
        setBillingLoading(true);
        const timeout = new Promise<never>((_, reject) => {
            billingTimerRef.current = setTimeout(
                () => reject(new Error("billing-timeout")),
                5000
            );
        });
        try {
            const res = (await Promise.race([
                fetch("/api/stripe/portal", { method: "POST" }),
                timeout,
            ])) as Response;
            const data = await res.json();
            if (res.ok && data.url) {
                // Portal opened: hand off to Stripe.
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "billing-unavailable");
            }
        } catch {
            // Timeout or failure: stay on settings, no plan change (Req 13.6).
            toast.error("Billing portal is unavailable. Please try again.");
        } finally {
            if (billingTimerRef.current) {
                clearTimeout(billingTimerRef.current);
                billingTimerRef.current = null;
            }
            setBillingLoading(false);
        }
    }

    return (
        <div className="relative mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Soft brand glow behind the header for premium depth. */}
            <div className="hero-gradient pointer-events-none absolute inset-x-0 -top-8 h-48" />

            <div className="relative">
                <span className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                    Account
                </span>
                <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
                    Settings
                </h1>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Manage your profile, appearance, billing, and data.
                </p>
            </div>

            {/* 1. Profile (Clerk-managed) */}
            <Section
                id="profile"
                icon={<UserIcon size={20} />}
                title="Profile"
                description="Your account details are managed through your sign-in provider."
            >
                <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                        <dt className="text-[var(--text-muted)]">Name</dt>
                        <dd className="font-medium text-[var(--text)]">
                            {user?.fullName || "—"}
                        </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                        <dt className="text-[var(--text-muted)]">Email</dt>
                        <dd className="font-medium text-[var(--text)]">
                            {user?.primaryEmailAddress?.emailAddress || "—"}
                        </dd>
                    </div>
                </dl>
            </Section>

            {/* 2. Appearance */}
            <Section
                id="appearance"
                icon={<PaletteIcon size={20} />}
                title="Appearance"
                description="Choose how TrackIQ looks. Your selection is saved for next time."
            >
                <ThemeSelector />
            </Section>

            {/* 3. Billing */}
            <Section
                id="billing"
                icon={<CreditCardIcon size={20} />}
                title="Billing"
                description="Review your plan and manage your subscription."
                action={
                    loading ? (
                        <Skeleton className="h-6 w-16" />
                    ) : (
                        <Badge tone={isPro ? "pro" : "neutral"}>
                            {isPro ? "Pro" : "Free"}
                        </Badge>
                    )
                }
            >
                {loading ? (
                    <Skeleton className="h-20" />
                ) : (
                    <>
                        <p className="text-sm text-[var(--text-muted)]">
                            {isPro
                                ? "You're on the Pro plan with unlimited applications, analytics, and data export."
                                : `You're on the Free plan. Track up to ${FREE_JOB_LIMIT} applications and upgrade for unlimited tracking, analytics, and exports.`}
                        </p>

                        {status === "past_due" && (
                            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300">
                                Your last payment failed. Update your card to keep
                                Pro access.
                            </div>
                        )}

                        <div className="mt-5">
                            <Button
                                variant="secondary"
                                onClick={handleManageBilling}
                                loading={billingLoading}
                            >
                                <CreditCardIcon size={16} /> Manage billing
                            </Button>
                        </div>
                    </>
                )}
            </Section>

            {/* 4. Data */}
            <Section
                id="data"
                icon={<DownloadIcon size={20} />}
                title="Data"
                description="Download all your applications, offers, and notes as a JSON file."
            >
                {loading ? (
                    <Skeleton className="h-10 w-40" />
                ) : exportGate.allowed ? (
                    <Button
                        variant="secondary"
                        onClick={handleExport}
                        loading={exporting}
                    >
                        <DownloadIcon size={16} /> Export my data
                    </Button>
                ) : (
                    <UpgradePrompt
                        variant="card"
                        message={exportGate.message ?? ""}
                        ctaLabel="Upgrade to Pro"
                    />
                )}
            </Section>

            {/* AI copilot opt-in (hidden unless the AI service is configured) */}
            <AiPrepToggle />

            {/* 5. Privacy */}
            <Section
                id="privacy"
                icon={<ShieldIcon size={20} />}
                title="Privacy"
                description="How your data is handled."
            >
                <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                    <li className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                        <LockIcon size={16} className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-300" />
                        <span>
                            Your applications, offers, and notes are private to
                            your account and never shared.
                        </span>
                    </li>
                    <li className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                        <LockIcon size={16} className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-300" />
                        <span>
                            Interview notes are stored privately and only visible
                            to you.
                        </span>
                    </li>
                </ul>
            </Section>

            {/* 6. Danger zone */}
            <Card className="gradient-border border border-rose-500/30 bg-rose-500/5 p-6 sm:p-7">
                <section id="danger-zone" aria-labelledby="danger-zone-heading">
                    <div className="flex items-start gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <AlertTriangleIcon size={20} />
                        </span>
                        <div>
                            <h2
                                id="danger-zone-heading"
                                className="font-display text-lg font-semibold tracking-tight text-rose-600 dark:text-rose-400"
                            >
                                Danger zone
                            </h2>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                                Sign out of your account on this device.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 sm:pl-14">
                        <Button variant="danger" onClick={() => signOut()}>
                            Sign out
                        </Button>
                    </div>
                </section>
            </Card>
        </div>
    );
}
