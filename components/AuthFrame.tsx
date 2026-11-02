import React from "react";
import Link from "next/link";

/**
 * The sign-in and sign-up pages: a ruled split with the world's display line
 * on the left and Clerk's form on the right. `clerkAppearance` dresses Clerk's
 * widget in the grid world: ultramarine primary, square corners, Archivo, flat.
 */
export const clerkAppearance = {
    variables: {
        colorPrimary: "#2f3bff",
        borderRadius: "0px",
        fontFamily: "var(--font-archivo), 'Helvetica Neue', Arial, sans-serif",
        fontSize: "0.9375rem",
    },
    elements: {
        card: "shadow-none border-2 border-[var(--ink)]",
        cardBox: "shadow-none",
        formButtonPrimary: "font-bold shadow-none",
        socialButtonsBlockButton: "border border-[var(--ink-muted)] shadow-none",
        formFieldInput: "border border-[var(--ink-muted)] shadow-none",
        footer: "bg-none",
    },
} as const;

export default function AuthFrame({ title, line, children }: { title: string; line: string; children: React.ReactNode }) {
    return (
        <div className="grid-world flex min-h-dvh flex-col">
            <header className="border-b-2 border-[var(--ink)]">
                <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center px-4 sm:px-8 lg:px-12">
                    <Link href="/" className="gw-display gw-wide text-[1.375rem] leading-none text-[var(--ink)]" aria-label="TrackIQ home">
                        TrackIQ
                    </Link>
                </div>
            </header>
            <main className="mx-auto grid w-full max-w-[90rem] flex-1 items-center gap-12 px-4 py-12 sm:px-8 lg:grid-cols-12 lg:gap-6 lg:px-12">
                <div className="lg:col-span-6">
                    <h1 className="gw-display max-w-[12ch] text-[clamp(2.75rem,6vw,6rem)]">{title}</h1>
                    <p className="mt-6 max-w-[30rem] text-lg leading-relaxed text-[var(--ink-muted)]">{line}</p>
                </div>
                <div className="flex lg:col-span-5 lg:col-start-8 lg:justify-end">{children}</div>
            </main>
        </div>
    );
}
