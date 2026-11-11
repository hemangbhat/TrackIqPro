"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useUserPlan } from "../../../../components/useUserPlan";
import { useToast } from "../../../../components/ui/Toast";
import { Card, Badge, Skeleton, Button } from "../../../../components/ui/primitives";
import { Switch } from "../../../../components/ui/Switch";
import {
    DownloadIcon,
    CreditCardIcon,
    SunIcon,
    MoonIcon,
    UserIcon,
    PaletteIcon,
    ShieldIcon,
    SparklesIcon,
} from "../../../../components/ui/icons";
import { FREE_JOB_LIMIT } from "../../../../lib/plans";
import { gateExport } from "../../../../lib/plan-gate";
import { useAiStatus } from "../../../../hooks/useAiStatus";
import { requestBillingUrl } from "../../../../lib/billing-client";

/**
 * Section wrapper: an ink-ruled block with its heading and an optional action
 * on the right. The `<section id aria-labelledby>` structure is preserved
 * exactly so the six settings anchors stay intact (Req 13.1).
 */
function Section({
    id,
    title,
    description,
    action,
    children,
}: {
    id: string;
    /** Kept for callers; the grid world draws no icon tiles. */
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <Card className="pb-2 pt-5">
            <section id={id} aria-labelledby={`${id}-heading`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 id={`${id}-heading`} className="text-xl font-extrabold tracking-[-0.01em] text-[var(--ink)]">
                            {title}
                        </h2>
                        {description && <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
                <div className="mt-5">{children}</div>
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
        <div role="group" aria-label="Theme" className="inline-flex border-2 border-[var(--ink)]">
            {options.map((opt) => {
                const selected = current === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setTheme(opt.value)}
                        className={
                            "inline-flex min-h-11 cursor-pointer items-center gap-2 px-5 text-sm font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-current [&+&]:border-l-2 [&+&]:border-[var(--ink)] " +
                            (selected
                                ? "bg-[var(--ultra)] text-[var(--on-ultra)]"
                                : "bg-[var(--paper)] text-[var(--ink-muted)] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[var(--ink)]")
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

const AI_PREP_SECTION = {
    id: "ai-prep",
    icon: <SparklesIcon size={20} />,
    title: "AI interview prep",
    description: "Get likely questions, weak spots, and a study plan drawn from your own notes.",
};

/**
 * Opt-in switch for the AI interview-prep copilot. Hidden entirely when the AI
 * service is not configured. Turning it off deletes the user's indexed notes
 * from the AI service, so it asks for an inline confirmation first. If that
 * delete fails the server still turns AI prep off, and we offer a retry.
 */
function AiPrepToggle() {
    const { status, statusError, loading, enableError, busy, refresh, setEnabled } = useAiStatus();
    const [confirmingOff, setConfirmingOff] = useState(false);
    const [deleteFailed, setDeleteFailed] = useState(false);

    if (loading) return null;

    // A failed status call is not "not configured": keep the off-switch reachable.
    if (statusError) {
        return (
            <Section {...AI_PREP_SECTION}>
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-[var(--text-muted)]">Couldn&apos;t load AI prep settings.</p>
                    <Button variant="secondary" size="sm" onClick={() => void refresh()}>
                        Retry
                    </Button>
                    {/* A failed delete followed by a failed re-check must not
                        hide the way to finish deleting the user's data. */}
                    {deleteFailed && (
                        <Button variant="secondary" size="sm" onClick={() => void turnOff()} loading={busy}>
                            Retry deleting data
                        </Button>
                    )}
                </div>
                {enableError && (
                    <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
                        {enableError}
                    </p>
                )}
            </Section>
        );
    }

    if (!status?.configured) return null;

    async function turnOff() {
        const ok = await setEnabled(false);
        setConfirmingOff(false);
        setDeleteFailed(!ok);
    }

    function turnOn() {
        setDeleteFailed(false);
        void setEnabled(true);
    }

    return (
        <Section {...AI_PREP_SECTION}>
            <div className="flex items-center justify-between gap-4 border-y border-[var(--hair)] py-3">
                <span id="ai-prep-label" className="text-sm font-bold text-[var(--ink)]">
                    AI interview prep
                </span>
                <Switch
                    checked={status.enabled}
                    aria-labelledby="ai-prep-label"
                    disabled={busy}
                    onChange={() => {
                        if (status.enabled) setConfirmingOff(true);
                        else turnOn();
                    }}
                />
            </div>

            {!status.enabled && (
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                    Your job descriptions and interview notes will be sent to OpenAI to build your
                    prep. You can turn this off any time.
                </p>
            )}

            {confirmingOff && (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-l-[6px] border-amber-600 bg-[var(--paper-2)] px-4 py-3">
                    <p className="text-sm font-medium text-[var(--ink)]">
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

            {deleteFailed && (
                <div className="mt-3">
                    <Button variant="secondary" size="sm" onClick={() => void turnOff()} loading={busy}>
                        Retry deleting data
                    </Button>
                </div>
            )}
        </Section>
    );
}

/**
 * On/off switch for the daily follow-up reminder digest. The same flag is
 * turned off by the signed unsubscribe link in each email.
 */
function RemindersToggle() {
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);

    async function load() {
        setFailed(false);
        try {
            const res = await fetch("/api/email-preferences");
            if (!res.ok) throw new Error(String(res.status));
            const data = (await res.json()) as { remindersEnabled?: boolean };
            setEnabled(data.remindersEnabled !== false);
        } catch {
            setFailed(true);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    async function toggle() {
        if (enabled === null) return;
        const next = !enabled;
        setBusy(true);
        setFailed(false);
        try {
            const res = await fetch("/api/email-preferences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remindersEnabled: next }),
            });
            if (!res.ok) throw new Error(String(res.status));
            setEnabled(next);
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="border-y border-[var(--hair)] py-3">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <span id="reminders-label" className="text-sm font-bold text-[var(--ink)]">
                        Follow-up reminder emails
                    </span>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        A daily digest when applications need a nudge.
                    </p>
                </div>
                {enabled !== null && (
                    <Switch
                        checked={enabled}
                        aria-labelledby="reminders-label"
                        disabled={busy}
                        onChange={() => void toggle()}
                    />
                )}
            </div>
            {failed && (
                <div className="mt-2 flex items-center gap-3">
                    <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                        Couldn&apos;t {enabled === null ? "load" : "save"} your email preference.
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => void (enabled === null ? load() : toggle())}>
                        Try again
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function SettingsPage() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const { plan, customerId, status, isPro, loading } = useUserPlan();
    const toast = useToast();
    const [exporting, setExporting] = useState(false);
    const [billingLoading, setBillingLoading] = useState(false);
    // Only someone who has paid has a Stripe customer, and so a portal to open.
    const canManageBilling = Boolean(customerId);

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
     * Hand off to Stripe: the billing portal for paying customers (5 s budget,
     * Req 13.6), checkout for Free users. On any failure the user stays on
     * settings with no plan change and sees why.
     */
    async function handleBilling() {
        setBillingLoading(true);
        const result = canManageBilling
            ? await requestBillingUrl("/api/stripe/portal", 5000)
            : await requestBillingUrl("/api/stripe/checkout", 30_000);
        if (result.ok) {
            window.location.href = result.url;
            return;
        }
        toast.error(
            result.message ??
                (canManageBilling
                    ? "Billing portal is unavailable. Please try again."
                    : "Could not start checkout. Please try again.")
        );
        setBillingLoading(false);
    }

    return (
        <div className="relative mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">

            <div className="relative">
                <h1 className="gw-display text-[clamp(2.25rem,4vw,3.5rem)] text-[var(--ink)] mt-1">
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
                <dl className="border-t border-[var(--hair)] text-sm">
                    <div className="grid gap-1 border-b border-[var(--hair)] py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-[var(--text-muted)]">Name</dt>
                        <dd className="min-w-0 break-words font-bold text-[var(--ink)]">{user?.fullName || "Not set"}</dd>
                    </div>
                    <div className="grid gap-1 border-b border-[var(--hair)] py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-[var(--text-muted)]">Email</dt>
                        <dd className="min-w-0 break-all font-bold text-[var(--ink)]">
                            {user?.primaryEmailAddress?.emailAddress || "Not set"}
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
                            <div
                                role="alert"
                                className="mt-4 border-l-[6px] border-amber-600 bg-[var(--paper-2)] px-4 py-3 text-sm font-medium text-[var(--ink)]"
                            >
                                Your last payment failed. Update your card to keep Pro access.
                            </div>
                        )}

                        {(canManageBilling || !isPro) && (
                            <div className="mt-5">
                                {canManageBilling ? (
                                    <Button variant="secondary" onClick={handleBilling} loading={billingLoading}>
                                        <CreditCardIcon size={16} /> Manage billing
                                    </Button>
                                ) : (
                                    <Button onClick={handleBilling} loading={billingLoading}>
                                        <SparklesIcon size={16} /> Upgrade to Pro, $9/month
                                    </Button>
                                )}
                            </div>
                        )}
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
                    // The upgrade action lives in Billing, just above.
                    <p className="text-sm text-[var(--text-muted)]">{exportGate.message}</p>
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
                <RemindersToggle />
                <ul className="text-sm text-[var(--text-muted)]">
                    <li className="border-b border-[var(--hair)] py-3">
                        Your applications, offers, and notes are private to your account and never shared.
                    </li>
                    <li className="border-b border-[var(--hair)] py-3">
                        Interview notes are stored privately and only visible to you.
                    </li>
                    <li className="py-3">
                        <Link href="/privacy" className="font-bold text-[var(--ultra-text)] underline underline-offset-4">
                            Read the privacy policy
                        </Link>
                    </li>
                </ul>
            </Section>

            {/* 6. Danger zone */}
            <section
                id="danger-zone"
                aria-labelledby="danger-zone-heading"
                className="border-t-2 border-rose-700 pb-2 pt-5 dark:border-rose-500"
            >
                <h2
                    id="danger-zone-heading"
                    className="text-xl font-extrabold tracking-[-0.01em] text-rose-700 dark:text-rose-400"
                >
                    Danger zone
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Sign out of your account on this device.</p>
                <div className="mt-5">
                    <Button variant="danger" onClick={() => signOut({ redirectUrl: "/" })}>
                        Sign out
                    </Button>
                </div>
            </section>
        </div>
    );
}
