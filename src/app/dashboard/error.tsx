"use client";
import { useEffect } from "react";
import Link from "next/link";

/**
 * A dashboard view that throws while rendering. The shell (nav, header) stays
 * up because this boundary sits inside the dashboard layout, so the user can
 * retry or move to another view.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
            <section role="alert" className="border-t-2 border-rose-700 pt-6 dark:border-rose-500">
                <h1 className="gw-display text-[clamp(2rem,4vw,3rem)] text-[var(--ink)]">This view didn&apos;t load</h1>
                <p className="mt-4 max-w-[34rem] leading-relaxed text-[var(--ink-muted)]">
                    Your data is safe. Something went wrong while showing it. Try again, or go back to the
                    overview.
                    {error.digest && <> Reference: {error.digest}.</>}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <button type="button" onClick={reset} className="gw-btn gw-btn-primary">
                        Try again
                    </button>
                    <Link href="/dashboard" className="gw-btn gw-btn-secondary">
                        Back to overview
                    </Link>
                </div>
            </section>
        </div>
    );
}
