import React from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "../../components/Providers";

/*
 * Premium type system (Stitch reference), self-hosted via next/font so there is
 * no manual <head> stylesheet link (which caused a hydration mismatch and the
 * no-page-custom-font warning). Each font exposes a CSS variable consumed by
 * globals.css: --font-geist (display), --font-inter (body), --font-jetbrains.
 */
const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-inter",
    display: "swap",
});

const geist = Geist({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-geist",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["500", "600"],
    variable: "--font-jetbrains",
    display: "swap",
});

const description =
    "Track applications, keep private interview notes, and compare offers with explainable scoring engines. Every score shows its work.";

export const metadata: Metadata = {
    title: { default: "TrackIQ — Job Search Command Center", template: "%s · TrackIQ" },
    description,
    applicationName: "TrackIQ",
    openGraph: {
        type: "website",
        siteName: "TrackIQ",
        title: "TrackIQ — Job Search Command Center",
        description,
    },
    twitter: { card: "summary", title: "TrackIQ — Job Search Command Center", description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
        >
            <html
                lang="en"
                suppressHydrationWarning
                className={`${inter.variable} ${geist.variable} ${jetbrainsMono.variable}`}
            >
                <body className="grain min-h-dvh antialiased">
                    <Providers>{children}</Providers>
                </body>
            </html>
        </ClerkProvider>
    );
}
