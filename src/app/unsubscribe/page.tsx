import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "../../../components/MarketingShell";
import { verifyUnsubscribeToken } from "../../../lib/unsubscribe";

export const metadata: Metadata = {
    title: "Unsubscribe",
    description: "Stop TrackIQ's follow-up reminder emails.",
    robots: { index: false },
};

type Search = { u?: string; t?: string; done?: string };

/**
 * Where the digest's "Unsubscribe" link lands. Opening it changes nothing
 * (mail scanners open links); the button POSTs to /api/email/unsubscribe.
 */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<Search> }) {
    const { u, t, done } = await searchParams;
    const valid = verifyUnsubscribeToken(u, t);

    let title: string;
    let body: React.ReactNode;
    if (done) {
        title = "You're unsubscribed";
        body = (
            <p>
                You won&apos;t get follow-up reminder emails any more. You can turn them back on any time in{" "}
                <Link href="/dashboard/settings#privacy" prefetch={false} className="gw-link">
                    Settings
                </Link>
                .
            </p>
        );
    } else if (valid) {
        title = "Stop reminder emails?";
        body = (
            <>
                <p>We&apos;ll stop sending the daily digest of applications that need a follow-up.</p>
                <form method="post" action={`/api/email/unsubscribe?u=${encodeURIComponent(u!)}&t=${encodeURIComponent(t!)}`}>
                    <button
                        type="submit"
                        className="gw-btn gw-btn-primary mt-8"
                    >
                        Unsubscribe from reminders
                    </button>
                </form>
            </>
        );
    } else {
        title = "This link doesn't work";
        body = (
            <p>
                The unsubscribe link is incomplete or has been changed. Use the link from your most recent
                email, or turn reminders off in{" "}
                <Link href="/dashboard/settings#privacy" prefetch={false} className="gw-link">
                    Settings
                </Link>
                .
            </p>
        );
    }

    return (
        <MarketingShell>
            <article className="mx-auto w-full max-w-[90rem] px-4 pb-28 pt-10 sm:px-8 sm:pt-12 lg:px-12">
                <h1 className="gw-display max-w-[14ch] text-[clamp(2.75rem,6vw,6rem)]">{title}</h1>
                <div className="mt-8 max-w-[36rem] border-t-2 border-[var(--ink)] pt-6 text-lg leading-relaxed text-[var(--ink-muted)]">
                    {body}
                </div>
            </article>
        </MarketingShell>
    );
}
