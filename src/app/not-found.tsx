import Link from "next/link";
import MarketingShell from "../../components/MarketingShell";

export default function NotFound() {
    return (
        <MarketingShell>
            <section className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 pb-28 pt-10 sm:px-8 sm:pt-12 lg:grid-cols-12 lg:gap-6 lg:px-12">
                <div className="lg:col-span-7">
                    <h1 className="gw-display max-w-[13ch] text-[clamp(2.75rem,6vw,6rem)]">
                        This page isn&apos;t in your pipeline
                    </h1>
                    <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-[var(--ink-muted)]">
                        The link may be outdated, or the page was moved. Head back to where you were
                        going.
                    </p>
                    <div className="mt-10 flex flex-wrap gap-3">
                        <Link href="/dashboard" className="gw-btn gw-btn-primary">
                            Go to dashboard
                        </Link>
                        <Link href="/" className="gw-btn gw-btn-secondary">
                            Back to home
                        </Link>
                    </div>
                </div>
                <p
                    aria-hidden
                    className="gw-num gw-wide self-end text-[clamp(7rem,18vw,17rem)] leading-[0.78] text-[var(--ultra-text)] lg:col-span-5 lg:text-right"
                >
                    404
                </p>
            </section>
        </MarketingShell>
    );
}
