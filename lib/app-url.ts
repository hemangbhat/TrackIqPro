// lib/app-url.ts
// Base URL for links we hand to third parties (Stripe redirect URLs). Taken
// from configuration, never from the request's Origin/Host headers, so a
// forged or missing header can't redirect a billing flow elsewhere.

import type { NextApiRequest } from "next";

export function appBaseUrl(req?: NextApiRequest): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (configured) return configured.replace(/\/+$/, "");
    // Local dev fallback only: production must set NEXT_PUBLIC_APP_URL.
    if (process.env.NODE_ENV !== "production" && req?.headers.host) {
        return `http://${req.headers.host}`;
    }
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
}
