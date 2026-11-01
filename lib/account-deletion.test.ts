// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.fn();
const cancel = vi.fn();
vi.mock("stripe", () => ({
    default: vi.fn(function () {
        return { subscriptions: { list, cancel } };
    }),
}));
// mongoose is connected to the in-memory server below.
vi.mock("./db", () => ({ connectDB: vi.fn() }));

import Job from "../models/Job";
import Note from "../models/Note";
import Offer from "../models/Offer";
import AiUsage from "../models/AiUsage";
import CareerProfile from "../models/CareerProfile";
import UserPlan from "../models/UserPlan";
import { startMemoryMongo, stopMemoryMongo } from "../test/mongo-memory";
import { deleteAccountData } from "./account-deletion";

async function seed(userId: string) {
    await Job.create({ userId, title: "Engineer", company: "Co" });
    await Note.create({ userId, title: "Round 1", content: "Asked about caching" });
    await Offer.create({ userId, offerId: `off_${userId}`, company: "Co", title: "Engineer", salaryBase: 100 });
    await AiUsage.create({ userId, date: "2026-11-01", count: 1 });
    await CareerProfile.create({ userId, skills: ["Go"] });
    await UserPlan.create({ userId, plan: "pro", customerId: `cus_${userId}` });
}

async function countFor(userId: string) {
    const counts = await Promise.all(
        [Job, Note, Offer, AiUsage, CareerProfile, UserPlan].map((m) =>
            (m as typeof Job).countDocuments({ userId })
        )
    );
    return counts.reduce((a, b) => a + b, 0);
}

beforeAll(async () => {
    await startMemoryMongo();
}, 120_000);

afterAll(async () => {
    await stopMemoryMongo();
});

beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test";
    list.mockResolvedValue({ data: [] });
    cancel.mockResolvedValue({});
    await Promise.all([Job, Note, Offer, AiUsage, CareerProfile, UserPlan].map((m) => (m as typeof Job).deleteMany({})));
});

describe("deleteAccountData", () => {
    it("deletes the user's rows in every collection and leaves other users alone", async () => {
        await seed("u1");
        await seed("u2");
        await deleteAccountData("u1");
        expect(await countFor("u1")).toBe(0);
        expect(await countFor("u2")).toBe(6);
    });

    it("cancels only live subscriptions on the user's Stripe customer", async () => {
        await seed("u1");
        list.mockResolvedValue({
            data: [
                { id: "sub_live", status: "active" },
                { id: "sub_old", status: "canceled" },
            ],
        });
        await deleteAccountData("u1");
        expect(list).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_u1" }));
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(cancel).toHaveBeenCalledWith("sub_live");
    });

    it("keeps the data when cancelling fails, so a retry can still cancel", async () => {
        await seed("u1");
        list.mockRejectedValue(new Error("stripe down"));
        await expect(deleteAccountData("u1")).rejects.toThrow("stripe down");
        expect(await UserPlan.countDocuments({ userId: "u1" })).toBe(1);
    });

    it("is safe to run again after it already succeeded", async () => {
        await seed("u1");
        await deleteAccountData("u1");
        await expect(deleteAccountData("u1")).resolves.toBeUndefined();
    });
});
