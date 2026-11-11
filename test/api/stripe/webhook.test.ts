// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
    constructEvent: vi.fn(),
    retrieve: vi.fn(),
}));

vi.mock("stripe", () => ({
    default: vi.fn(function () {
        return { webhooks: { constructEvent: h.constructEvent }, subscriptions: { retrieve: h.retrieve } };
    }),
}));
vi.mock("micro", () => ({ buffer: vi.fn(async () => Buffer.from("{}")) }));
vi.mock("../../../lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("../../../lib/stripe", () => ({
    getPlanSubscriptionId: vi.fn(async () => null),
    hasPlanRecord: vi.fn(async () => false),
    updateUserPlanInDB: vi.fn(),
}));

import { hasPlanRecord, updateUserPlanInDB } from "../../../lib/stripe";
import handler from "../../../pages/api/stripe/webhook";

function post() {
    const out = { status: 0 };
    const res = {
        status(code: number) {
            out.status = code;
            return res;
        },
        json: () => res,
        send: () => res,
    };
    return handler({ headers: { "stripe-signature": "sig" } } as never, res as never).then(() => out);
}

function subscriptionEvent(type: string, userId = "user_1") {
    h.constructEvent.mockReturnValue({
        id: "evt_1",
        type,
        data: { object: { id: "sub_1", metadata: userId ? { userId } : {} } },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("POST /api/stripe/webhook", () => {
    it("refuses events with 500 when the webhook secret is not set", async () => {
        delete process.env.STRIPE_WEBHOOK_SECRET;
        const err = vi.spyOn(console, "error").mockImplementation(() => {});
        expect((await post()).status).toBe(500);
        expect(h.constructEvent).not.toHaveBeenCalled();
        err.mockRestore();
    });

    it("does not recreate a deleted account's plan row from a late cancellation", async () => {
        // Account deletion cancelled the subscription and removed the row.
        subscriptionEvent("customer.subscription.deleted");
        h.retrieve.mockResolvedValue({ id: "sub_1", status: "canceled", customer: "cus_1", trial_end: null });
        expect((await post()).status).toBe(200);
        expect(updateUserPlanInDB).not.toHaveBeenCalled();
    });

    it("still grants Pro to a user with no plan row yet", async () => {
        subscriptionEvent("customer.subscription.updated");
        h.retrieve.mockResolvedValue({ id: "sub_1", status: "active", customer: "cus_1", trial_end: null });
        expect((await post()).status).toBe(200);
        expect(updateUserPlanInDB).toHaveBeenCalledWith("user_1", "pro", "cus_1", "active", null, "sub_1");
    });

    it("still downgrades an existing user whose subscription ended", async () => {
        vi.mocked(hasPlanRecord).mockResolvedValueOnce(true);
        subscriptionEvent("customer.subscription.deleted");
        h.retrieve.mockResolvedValue({ id: "sub_1", status: "canceled", customer: "cus_1", trial_end: null });
        await post();
        expect(updateUserPlanInDB).toHaveBeenCalledWith("user_1", "free", "cus_1", expect.anything(), null, "sub_1");
    });

    it("logs a subscription event skipped for missing userId metadata", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        subscriptionEvent("customer.subscription.updated", "");
        expect((await post()).status).toBe(200);
        expect(warn.mock.calls[0][0]).toContain("evt_1");
        expect(updateUserPlanInDB).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});
