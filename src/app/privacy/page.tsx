import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "../../../components/MarketingShell";

export const metadata: Metadata = {
    title: "Privacy",
    description: "What TrackIQ stores, where it lives, and who processes it.",
};

// A plain-language summary of how the app actually handles data. Every item
// below maps to code in this repository (models/, pages/api/, lib/).
const sections: { title: string; body: React.ReactNode }[] = [
    {
        title: "What we store",
        body: (
            <>
                The applications, interview notes, offers, and career profile you enter, plus
                your plan status. Every record is tagged with your account id and every API
                query is scoped to it, so no other account can read or change your data.
            </>
        ),
    },
    {
        title: "Who processes it",
        body: (
            <ul className="list-disc space-y-1.5 pl-5">
                <li>Clerk — sign-in and your account email and name.</li>
                <li>MongoDB — your tracker data.</li>
                <li>
                    Stripe — payments. We keep only your Stripe customer id and plan status, never
                    card details.
                </li>
                <li>Resend — the welcome email and optional follow-up reminder digests.</li>
                <li>Upstash Redis — short-lived rate-limit counters and reminder de-duplication keys.</li>
            </ul>
        ),
    },
    {
        title: "Scoring",
        body: (
            <>
                Job fit, offer ranking, and career health are computed by deterministic
                functions from your own data. Nothing is sent to third-party AI services.
            </>
        ),
    },
    {
        title: "Your control",
        body: (
            <>
                You can edit or delete any record at any time. Pro accounts can export their data
                from Settings. Billing is managed through the Stripe customer portal.
            </>
        ),
    },
];

export default function PrivacyPage() {
    return (
        <MarketingShell>
            <article className="mx-auto max-w-2xl px-6 py-20">
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">Privacy</p>
                <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-[var(--text)]">
                    Your data, in plain language
                </h1>
                <p className="mt-4 text-[var(--text-muted)]">
                    TrackIQ is a private workspace. This page explains exactly what the app keeps and
                    why.
                </p>
                <div className="mt-12 space-y-10">
                    {sections.map((s) => (
                        <section key={s.title}>
                            <h2 className="font-display text-xl font-semibold text-[var(--text)]">
                                {s.title}
                            </h2>
                            <div className="mt-3 leading-relaxed text-[var(--text-muted)]">{s.body}</div>
                        </section>
                    ))}
                </div>
                <Link
                    href="/"
                    className="mt-14 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
                >
                    ← Back to home
                </Link>
            </article>
        </MarketingShell>
    );
}
