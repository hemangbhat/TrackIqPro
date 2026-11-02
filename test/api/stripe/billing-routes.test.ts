// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// The routes read their config at import time, so it must be set first.
vi.hoisted(() => {
    process.env.STRIPE_PRICE_ID = "price_test";
    process.env.NEXT_PUBLIC_APP_URL = "https://trackiq.test";
});

const stripeMock = vi.hoisted(() => ({
    checkoutCreate: vi.fn(),
    portalCreate: vi.fn(),
}));

vi.mock("stripe", () => ({
    default: class {
        checkout = { sessions: { create: stripeMock.checkoutCreate } };
        billingPortal = { sessions: { create: stripeMock.portalCreate } };
    },
}));
vi.mock("@clerk/nextjs/server", () => ({
    getAuth: vi.fn(),
    clerkClient: vi.fn().mockResolvedValue({
        users: { getUser: vi.fn().mockResolvedValue({ primaryEmailAddress: { emailAddress: "u1@example.com" } }) },
    }),
}));
vi.mock("../../../lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../lib/rate-limit", () => ({ enforceRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock("../../../lib/stripe", () => ({ getUserPlan: vi.fn(), isPro: (p: string) => p === "pro" }));

import { getAuth } from "@clerk/nextjs/server";
import { getUserPlan } from "../../../lib/stripe";
import checkout from "../../../pages/api/stripe/checkout";
import portal from "../../../pages/api/stripe/portal";

function call(handler: (req: never, res: never) => unknown) {
    const out = { status: 0, body: undefined as unknown };
    const res = {
        setHeader: vi.fn(),
        status(code: number) {
            out.status = code;
            return res;
        },
        json(b: unknown) {
            out.body = b;
            return res;
        },
    };
    return Promise.resolve(handler({ method: "POST", headers: {}, socket: {} } as never, res as never)).then(() => out);
}

function plan(customerId: string | null, p: "free" | "pro" = "free") {
    vi.mocked(getUserPlan).mockResolvedValue({ plan: p, customerId, status: "active", trialEnd: null });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuth).mockReturnValue({ userId: "u1" } as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/stripe/checkout", () => {
    it("starts checkout for a Free user with their email", async () => {
        plan(null);
        stripeMock.checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/x" });

        const out = await call(checkout);

        expect(out).toEqual({ status: 200, body: { url: "https://checkout.stripe.com/c/x" } });
        const params = stripeMock.checkoutCreate.mock.calls[0][0];
        expect(params.customer_email).toBe("u1@example.com");
        expect(params.success_url).toBe("https://trackiq.test/dashboard?upgrade=success");
    });

    it("retries with a new customer when the stored one no longer exists in Stripe", async () => {
        plan("cus_gone");
        stripeMock.checkoutCreate
            .mockRejectedValueOnce(Object.assign(new Error("No such customer"), { code: "resource_missing", param: "customer" }))
            .mockResolvedValueOnce({ url: "https://checkout.stripe.com/c/y" });

        const out = await call(checkout);

        expect(out.status).toBe(200);
        expect(stripeMock.checkoutCreate).toHaveBeenCalledTimes(2);
        expect(stripeMock.checkoutCreate.mock.calls[0][0].customer).toBe("cus_gone");
        expect(stripeMock.checkoutCreate.mock.calls[1][0].customer).toBeUndefined();
        expect(stripeMock.checkoutCreate.mock.calls[1][0].customer_email).toBe("u1@example.com");
    });

    it("does not retry other Stripe failures and returns a readable message", async () => {
        plan("cus_ok");
        stripeMock.checkoutCreate.mockRejectedValue(Object.assign(new Error("boom"), { code: "api_error" }));

        const out = await call(checkout);

        expect(stripeMock.checkoutCreate).toHaveBeenCalledTimes(1);
        expect(out.status).toBe(500);
        expect((out.body as { error: string }).error).toMatch(/checkout couldn't start/i);
    });

    it("refuses a second subscription for a Pro user", async () => {
        plan("cus_ok", "pro");
        const out = await call(checkout);
        expect(out.status).toBe(409);
        expect(stripeMock.checkoutCreate).not.toHaveBeenCalled();
    });
});

describe("POST /api/stripe/portal", () => {
    it("tells a user with no Stripe customer to upgrade first", async () => {
        plan(null);
        const out = await call(portal);
        expect(out.status).toBe(400);
        expect((out.body as { error: string }).error).toMatch(/upgrade to pro first/i);
        expect(stripeMock.portalCreate).not.toHaveBeenCalled();
    });

    it("returns 503 with a clear message when the Stripe portal was never configured", async () => {
        plan("cus_ok");
        stripeMock.portalCreate.mockRejectedValue(
            Object.assign(new Error("No configuration provided and your test mode default configuration has not been created."), {
                type: "StripeInvalidRequestError",
            })
        );

        const out = await call(portal);

        expect(out.status).toBe(503);
        expect((out.body as { error: string }).error).toMatch(/billing management isn't available/i);
    });

    it("opens the portal for a paying customer", async () => {
        plan("cus_ok", "pro");
        stripeMock.portalCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/z" });

        const out = await call(portal);

        expect(out).toEqual({ status: 200, body: { url: "https://billing.stripe.com/p/z" } });
        expect(stripeMock.portalCreate.mock.calls[0][0]).toEqual({
            customer: "cus_ok",
            return_url: "https://trackiq.test/dashboard/settings",
        });
    });
});
