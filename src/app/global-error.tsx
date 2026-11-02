"use client";
import "./globals.css";

/**
 * Last resort: the root layout itself failed, so nothing else (fonts,
 * providers, shell) can be trusted to render. Plain markup on the grid tokens.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="en">
            <body className="grid-world min-h-dvh">
                <main className="mx-auto w-full max-w-[90rem] px-4 py-16 sm:px-8 lg:px-12">
                    <p className="text-xl font-extrabold">TrackIQ</p>
                    <h1 className="mt-12 max-w-[14ch] text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
                        TrackIQ didn&apos;t load
                    </h1>
                    <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[var(--ink-muted)]">
                        Something broke on our side. Try again in a moment.
                        {error.digest && <> Reference: {error.digest}.</>}
                    </p>
                    <button type="button" onClick={reset} className="gw-btn gw-btn-primary mt-10">
                        Try again
                    </button>
                </main>
            </body>
        </html>
    );
}
