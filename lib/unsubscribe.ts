// lib/unsubscribe.ts
// Signed, login-free unsubscribe links for the follow-up reminder digest.
//
// A link carries the user id and an HMAC of it, so it can't be forged for
// another account. The signing key is derived from CRON_SECRET (the digest
// can't be sent without it anyway) with a fixed label, so the cron's bearer
// secret itself never appears in a URL.

import { createHmac, timingSafeEqual } from "crypto";

function signingKey(): Buffer | null {
    const secret = process.env.CRON_SECRET;
    if (!secret) return null;
    return createHmac("sha256", secret).update("trackiq-unsubscribe-v1").digest();
}

/** The token for `userId`, or null when no signing secret is configured. */
export function unsubscribeToken(userId: string): string | null {
    const key = signingKey();
    if (!key) return null;
    return createHmac("sha256", key).update(userId).digest("base64url");
}

/** Constant-time check that `token` was issued for `userId`. */
export function verifyUnsubscribeToken(userId: unknown, token: unknown): boolean {
    if (typeof userId !== "string" || typeof token !== "string" || !userId || !token) return false;
    const expected = unsubscribeToken(userId);
    if (!expected) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Links for one user's digest: `page` is the confirm page shown when someone
 * clicks the email link (a GET must not unsubscribe, since mail scanners
 * prefetch links); `oneClick` is the RFC 8058 POST target that mail clients'
 * own "Unsubscribe" button calls. Null when no signing secret is configured.
 */
export function unsubscribeLinks(appUrl: string, userId: string): { page: string; oneClick: string } | null {
    const token = unsubscribeToken(userId);
    if (!token) return null;
    const base = appUrl.replace(/\/+$/, "");
    const query = `u=${encodeURIComponent(userId)}&t=${encodeURIComponent(token)}`;
    return { page: `${base}/unsubscribe?${query}`, oneClick: `${base}/api/email/unsubscribe?${query}` };
}
