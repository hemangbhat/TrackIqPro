import { describe, it, expect } from "vitest";
import { planFromSubscriptionStatus } from "./plans";
import { isObjectId } from "./api-helpers";

describe("planFromSubscriptionStatus", () => {
    it("grants Pro only for active and trialing subscriptions", () => {
        expect(planFromSubscriptionStatus("active")).toEqual({ plan: "pro", status: "active" });
        expect(planFromSubscriptionStatus("trialing")).toEqual({ plan: "pro", status: "trialing" });
    });

    it("downgrades payment-failure states to Free / past_due", () => {
        expect(planFromSubscriptionStatus("past_due")).toEqual({ plan: "free", status: "past_due" });
        expect(planFromSubscriptionStatus("unpaid")).toEqual({ plan: "free", status: "past_due" });
    });

    it("fails closed for canceled, incomplete, paused, and unknown statuses", () => {
        for (const s of ["canceled", "incomplete", "incomplete_expired", "paused", "something_new"]) {
            expect(planFromSubscriptionStatus(s)).toEqual({ plan: "free", status: "canceled" });
        }
    });
});

describe("isObjectId", () => {
    it("accepts 24-char hex ids", () => {
        expect(isObjectId("64b7f0c2a1b2c3d4e5f60718")).toBe(true);
        expect(isObjectId("64B7F0C2A1B2C3D4E5F60718")).toBe(true);
    });

    it("rejects malformed or non-string ids", () => {
        for (const v of ["", "123", "not-an-id-not-an-id-1234", "64b7f0c2a1b2c3d4e5f6071", ["64b7f0c2a1b2c3d4e5f60718"], undefined]) {
            expect(isObjectId(v)).toBe(false);
        }
    });
});
