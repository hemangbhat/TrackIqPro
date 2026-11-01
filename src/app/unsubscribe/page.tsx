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
                <Link href="/dashboard/settings#privacy" prefetch={false} className="font-semibold text-indigo-600 dark:text-indigo-300">
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
                        className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                <Link href="/dashboard/settings#privacy" prefetch={false} className="font-semibold text-indigo-600 dark:text-indigo-300">
                    Settings
                </Link>
                .
            </p>
        );
    }

    return (
        <MarketingShell>
            <article className="mx-auto max-w-xl px-6 py-20">
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">Email preferences</p>
                <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">{title}</h1>
                <div className="mt-4 leading-relaxed text-[var(--text-muted)]">{body}</div>
            </article>
        </MarketingShell>
    );
}
