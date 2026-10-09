import Link from "next/link";
import MarketingShell from "../../components/MarketingShell";

export default function NotFound() {
    return (
        <MarketingShell>
            <section className="mx-auto flex max-w-xl flex-col items-start px-6 py-28">
                <span className="font-display tabular text-8xl font-bold tracking-tighter text-[var(--border)]">
                    404
                </span>
                <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-[var(--text)]">
                    This page isn&apos;t in your pipeline
                </h1>
                <p className="mt-3 text-[var(--text-muted)]">
                    The link may be outdated, or the page was moved. Head back to where you were
                    going.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                        href="/dashboard"
                        className="inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-500"
                    >
                        Go to dashboard
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-5 text-sm font-semibold text-[var(--text)] transition-colors duration-200 hover:bg-[var(--surface-2)]"
                    >
                        Back to home
                    </Link>
                </div>
            </section>
        </MarketingShell>
    );
}
