import { afterEach, describe, expect, it, vi } from "vitest";
import { requestBillingUrl } from "./billing-client";

function respond(status: number, body: unknown) {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    } as Response);
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("requestBillingUrl", () => {
    it("returns Stripe's URL on success", async () => {
        respond(200, { url: "https://checkout.stripe.com/c/x" });
        await expect(requestBillingUrl("/api/stripe/checkout", 1000)).resolves.toEqual({
            ok: true,
            url: "https://checkout.stripe.com/c/x",
        });
    });

    it("passes the server's own message through", async () => {
        respond(400, { error: "There's no subscription to manage yet. Upgrade to Pro first." });
        await expect(requestBillingUrl("/api/stripe/portal", 1000)).resolves.toEqual({
            ok: false,
            message: "There's no subscription to manage yet. Upgrade to Pro first.",
        });
    });

    it("explains an expired session and rate limiting", async () => {
        respond(401, {});
        expect(await requestBillingUrl("/api/stripe/checkout", 1000)).toEqual({
            ok: false,
            message: expect.stringMatching(/sign in again/i),
        });
        respond(429, {});
        expect(await requestBillingUrl("/api/stripe/checkout", 1000)).toEqual({
            ok: false,
            message: expect.stringMatching(/too many attempts/i),
        });
    });

    it("never redirects to a non-https URL", async () => {
        respond(200, { url: "javascript:alert(1)" });
        expect(await requestBillingUrl("/api/stripe/checkout", 1000)).toEqual({ ok: false, message: null });
    });

    it("gives up after the timeout even if fetch never settles", async () => {
        vi.useFakeTimers();
        vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
        const pending = requestBillingUrl("/api/stripe/portal", 5000);
        await vi.advanceTimersByTimeAsync(5001);
        await expect(pending).resolves.toEqual({ ok: false, message: null });
    });

    it("treats a network failure as no message", async () => {
        vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
        expect(await requestBillingUrl("/api/stripe/checkout", 1000)).toEqual({ ok: false, message: null });
    });
});
