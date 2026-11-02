"use client";
import { useEffect } from "react";
import Link from "next/link";
import MarketingShell from "../../components/MarketingShell";

/** Any public page that throws while rendering lands here instead of a blank screen. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <MarketingShell>
            <section className="mx-auto w-full max-w-[90rem] px-4 pb-28 pt-10 sm:px-8 sm:pt-12 lg:px-12">
                <h1 className="gw-display max-w-[14ch] text-[clamp(2.75rem,6vw,6rem)]">This page didn&apos;t load</h1>
                <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-[var(--ink-muted)]">
                    Something broke on our side. Trying again usually fixes it.
                    {error.digest && <> If it keeps happening, mention reference {error.digest}.</>}
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                    <button type="button" onClick={reset} className="gw-btn gw-btn-primary">
                        Try again
                    </button>
                    <Link href="/" className="gw-btn gw-btn-secondary">
                        Back to home
                    </Link>
                </div>
            </section>
        </MarketingShell>
    );
}
