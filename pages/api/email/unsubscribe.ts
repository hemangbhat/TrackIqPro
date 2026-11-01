import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "../../../lib/db";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { verifyUnsubscribeToken } from "../../../lib/unsubscribe";
import CareerProfile from "../../../models/CareerProfile";

/**
 * Turn off the follow-up reminder digest without signing in.
 *
 * POST only: a GET must never change state, because mail security scanners
 * open every link in an email. Two callers:
 * - the confirm page's form (redirected back to the page with ?done=1), and
 * - a mail client's own button (RFC 8058, body "List-Unsubscribe=One-Click"),
 *   which only needs a 200.
 * The `u`/`t` query parameters are the user id and its HMAC (lib/unsubscribe).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
    if (await enforceRateLimit(req, res, { tier: "mutation" })) return;

    const { u, t } = req.query;
    if (!verifyUnsubscribeToken(u, t)) {
        return res.status(400).json({ error: "This unsubscribe link is invalid." });
    }
    const userId = u as string;

    try {
        await connectDB();
        await CareerProfile.updateOne(
            { userId },
            { $set: { remindersEnabled: false } },
            { upsert: true, setDefaultsOnInsert: true }
        );
    } catch (err) {
        console.error("[email/unsubscribe] failed:", err instanceof Error ? err.name : "unknown");
        return res.status(500).json({ error: "Couldn't unsubscribe right now. Please try again." });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    if (body["List-Unsubscribe"] === "One-Click") return res.status(200).json({ ok: true });
    res.setHeader("Location", "/unsubscribe?done=1");
    return res.status(303).end();
}
