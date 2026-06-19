import type { NextApiRequest, NextApiResponse } from "next";
import { Webhook } from "svix";
import { sendWelcomeEmail } from "../../../lib/email";

// Clerk delivers a raw JSON body that must be verified with Svix using the
// exact bytes — so disable Next's body parser and read the raw buffer.
export const config = { api: { bodyParser: false } };

function readRawBody(req: NextApiRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

type ClerkEmail = { id: string; email_address: string };
interface ClerkUserCreated {
    type: string;
    data: {
        id: string;
        first_name?: string | null;
        primary_email_address_id?: string | null;
        email_addresses?: ClerkEmail[];
    };
}

/**
 * Clerk webhook receiver.
 *
 * On `user.created` it sends a branded welcome email (best-effort — email
 * failures never fail the webhook, so Clerk won't retry forever). Requires
 * CLERK_WEBHOOK_SECRET; if unset, the endpoint returns 200 and no-ops so an
 * unconfigured environment doesn't error.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({ error: "Method not allowed" });
    }

    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
        // Not configured — acknowledge so Clerk doesn't retry; do nothing.
        console.warn("[clerk/webhook] CLERK_WEBHOOK_SECRET not set; skipping verification");
        return res.status(200).json({ ok: true, skipped: true });
    }

    let evt: ClerkUserCreated;
    try {
        const payload = (await readRawBody(req)).toString("utf8");
        const wh = new Webhook(secret);
        evt = wh.verify(payload, {
            "svix-id": req.headers["svix-id"] as string,
            "svix-timestamp": req.headers["svix-timestamp"] as string,
            "svix-signature": req.headers["svix-signature"] as string,
        }) as ClerkUserCreated;
    } catch {
        return res.status(400).json({ error: "Invalid signature" });
    }

    try {
        if (evt.type === "user.created") {
            const { first_name, primary_email_address_id, email_addresses } = evt.data;
            const primary =
                email_addresses?.find((e) => e.id === primary_email_address_id) ||
                email_addresses?.[0];
            if (primary?.email_address) {
                await sendWelcomeEmail({
                    to: primary.email_address,
                    firstName: first_name ?? undefined,
                });
            }
        }
    } catch (err) {
        // Log but still 200 — a transient email error shouldn't trigger endless
        // Clerk retries; the account is already created regardless.
        console.error("[clerk/webhook] handler error:", err);
    }

    return res.status(200).json({ ok: true });
}
