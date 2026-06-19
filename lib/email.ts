// lib/email.ts
// Transactional email via Resend. Server-only.
//
// Safe-by-default: if RESEND_API_KEY is not set, send* functions become no-ops
// that log and return `{ skipped: true }` so the app never crashes in
// environments without email configured. Set RESEND_API_KEY and EMAIL_FROM to
// enable real delivery.

import { Resend } from "resend";
import { renderWelcomeEmail } from "./email-templates";

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
