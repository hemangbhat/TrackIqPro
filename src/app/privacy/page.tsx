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
            <ul className="list-disc space-y-2 pl-5">
                <li>Clerk — sign-in and your account email and name.</li>
                <li>MongoDB — your tracker data.</li>
                <li>
                    Stripe — payments. We keep only your Stripe customer id and plan status, never
                    card details.
                </li>
                <li>
                    Resend — the welcome email and a daily digest when applications need a follow-up.
                    Every digest has an unsubscribe link, and you can turn it off in Settings.
                </li>
                <li>Upstash Redis — short-lived rate-limit counters and reminder de-duplication keys.</li>
                <li>
                    OpenAI and Pinecone — only if you turn on AI interview prep in Settings: your job
                    descriptions and notes are embedded and stored as vectors, and the matching
                    passages are sent to OpenAI to write your prep.
                </li>
            </ul>
        ),
    },
    {
        title: "Scoring",
        body: (
            <>
                Job fit, offer ranking, and career health are computed by deterministic
                functions from your own data. Nothing is sent to a third-party AI service unless
                you opt in to AI interview prep, and turning it off deletes your stored vectors.
            </>
        ),
    },
    {
        title: "Your control",
        body: (
            <>
                You can edit or delete any record at any time. Pro accounts can export their data
                from Settings. Billing is managed through the Stripe customer portal. Deleting your
                account cancels any subscription and erases your applications, notes, offers,
                profile, plan record, and AI vectors.
            </>
        ),
    },
];

export default function PrivacyPage() {
    return (
        <MarketingShell>
            <article className="mx-auto w-full max-w-[90rem] px-4 pb-24 pt-10 sm:px-8 sm:pt-12 lg:px-12">
                <h1 className="gw-display max-w-[14ch] text-[clamp(3rem,7vw,7rem)]">
                    Your data, in plain language
                </h1>
                <p className="mt-8 max-w-[38rem] text-lg leading-relaxed text-[var(--ink-muted)] sm:text-xl">
                    TrackIQ is a private workspace. This page explains exactly what the app keeps and
                    why.
                </p>
                <div className="mt-16 border-t-2 border-[var(--ink)]">
                    {sections.map((s) => (
                        <section
                            key={s.title}
                            className="grid gap-4 border-b border-[var(--hair)] py-10 lg:grid-cols-12 lg:gap-6"
                        >
                            <h2 className="text-2xl font-extrabold tracking-[-0.02em] lg:col-span-4">
                                {s.title}
                            </h2>
                            <div className="max-w-[40rem] text-[1.0625rem] leading-relaxed text-[var(--ink-muted)] lg:col-span-7 lg:col-start-6 [&_li]:marker:text-[var(--ink)]">
                                {s.body}
                            </div>
                        </section>
                    ))}
                </div>
                <Link href="/" className="gw-link mt-12 inline-flex min-h-11 items-center gap-2">
                    Back to home
                </Link>
            </article>
        </MarketingShell>
    );
}
