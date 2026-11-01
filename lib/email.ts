// lib/email.ts
// Transactional email via Resend. Server-only.
//
// Safe-by-default: if RESEND_API_KEY is not set, send* functions become no-ops
// that log and return `{ skipped: true }` so the app never crashes in
// environments without email configured. Set RESEND_API_KEY and EMAIL_FROM to
// enable real delivery.

import { Resend } from "resend";
import { renderWelcomeEmail, renderFollowUpDigestEmail, type DigestItem } from "./email-templates";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "TrackIQ <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://trackiq.app";

export const emailEnabled = Boolean(apiKey);

const resend = emailEnabled ? new Resend(apiKey!) : null;

export interface SendResult {
    sent: boolean;
    skipped?: boolean;
    id?: string;
    error?: string;
}

async function send(to: string, subject: string, html: string): Promise<SendResult> {
    if (!resend) {
        // No provider configured — no-op (do not throw).
        console.warn(`[email] RESEND_API_KEY not set; skipped email to ${to} ("${subject}")`);
        return { sent: false, skipped: true };
    }
    try {
        const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
        if (error) return { sent: false, error: error.message };
        return { sent: true, id: data?.id };
    } catch (err) {
        return { sent: false, error: err instanceof Error ? err.message : String(err) };
    }
}

/** Welcome email sent when a user first registers (via the Clerk webhook). */
export async function sendWelcomeEmail(params: {
    to: string;
    firstName?: string;
}): Promise<SendResult> {
    const html = renderWelcomeEmail({ firstName: params.firstName, appUrl: APP_URL });
    return send(params.to, "Welcome to TrackIQ — your job search command center", html);
}

export interface DigestParams {
    to: string;
    firstName?: string;
    items: DigestItem[];
}

function renderDigest(params: DigestParams): { subject: string; html: string } {
    const html = renderFollowUpDigestEmail({
        firstName: params.firstName,
        items: params.items,
        appUrl: APP_URL,
    });
    const subject = `${params.items.length} follow-up${
        params.items.length === 1 ? "" : "s"
    } due on TrackIQ`;
    return { subject, html };
}

/** Follow-up reminder digest (sent by the scheduled cron job). */
export async function sendFollowUpDigest(params: DigestParams): Promise<SendResult> {
    if (params.items.length === 0) return { sent: false, skipped: true };
    const { subject, html } = renderDigest(params);
    return send(params.to, subject, html);
}

/** Resend accepts at most 100 emails per batch call. */
export const DIGEST_BATCH_SIZE = 100;

/**
 * Send many digests with one Resend call per 100, instead of one call each,
 * so the daily cron stays inside its time limit as users grow. Returns how
 * many were accepted; a failed batch is logged and skipped, not thrown.
 */
export async function sendFollowUpDigests(digests: DigestParams[]): Promise<number> {
    const toSend = digests.filter((d) => d.items.length > 0);
    if (toSend.length === 0) return 0;
    if (!resend) {
        console.warn(`[email] RESEND_API_KEY not set; skipped ${toSend.length} digest emails`);
        return 0;
    }
    let sent = 0;
    for (let i = 0; i < toSend.length; i += DIGEST_BATCH_SIZE) {
        const batch = toSend.slice(i, i + DIGEST_BATCH_SIZE).map((d) => ({
            from: FROM,
            to: d.to,
            ...renderDigest(d),
        }));
        try {
            const { error } = await resend.batch.send(batch);
            if (error) console.error(`[email] digest batch failed: ${error.message}`);
            else sent += batch.length;
        } catch (err) {
            console.error("[email] digest batch failed:", err instanceof Error ? err.message : err);
        }
    }
    return sent;
}
