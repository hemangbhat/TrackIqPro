// lib/billing-client.ts
// Browser side of the Stripe hand-off shared by Settings and Pricing: POST to
// our checkout/portal route, and either get Stripe's URL back or a message the
// user can act on. Plan changes never happen here, only in the webhook.

export type BillingEndpoint = "/api/stripe/checkout" | "/api/stripe/portal";

export type BillingResult = { ok: true; url: string } | { ok: false; message: string | null };

/**
 * Ask the server for a Stripe URL. Resolves (never rejects) within
 * `timeoutMs`. `message` is the server's own user-facing error when it sent
 * one, or null for network failures and timeouts so callers show their own.
 */
export async function requestBillingUrl(endpoint: BillingEndpoint, timeoutMs: number): Promise<BillingResult> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Racing a timer as well as aborting covers fetch implementations that
    // ignore the signal.
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(new Error("billing-timeout"));
        }, timeoutMs);
    });

    try {
        const res = await Promise.race([fetch(endpoint, { method: "POST", signal: controller.signal }), timeout]);
        const data = (await res.json().catch(() => ({}))) as { url?: unknown; error?: unknown };
        if (res.ok && typeof data.url === "string" && /^https:\/\//.test(data.url)) {
            return { ok: true, url: data.url };
        }
        if (res.status === 401) return { ok: false, message: "Your session expired. Sign in again to continue." };
        if (res.status === 429) return { ok: false, message: "Too many attempts. Wait a minute and try again." };
        return { ok: false, message: typeof data.error === "string" ? data.error : null };
    } catch {
        return { ok: false, message: null };
    } finally {
        clearTimeout(timer);
    }
}
