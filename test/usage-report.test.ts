// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { startMemoryMongo, stopMemoryMongo } from "./mongo-memory";
import { usageReport } from "../scripts/usage-report.mjs";

const NOW = new Date("2026-11-02T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

beforeAll(async () => {
    await startMemoryMongo();
    const db = mongoose.connection.db!;
    await db.collection("jobs").insertMany([
        { userId: "a", updatedAt: daysAgo(1) },
        { userId: "a", updatedAt: daysAgo(20) }, // a: two different weeks -> returning
        { userId: "b", updatedAt: daysAgo(10) },
        { userId: "c", updatedAt: daysAgo(60) },
    ]);
    await db.collection("notes").insertMany([{ userId: "d", updatedAt: daysAgo(2) }]);
    await db.collection("offers").insertMany([{ userId: "a" }]);
    await db.collection("aiusages").insertMany([
        { userId: "a", date: "2026-11-01", count: 3 },
        { userId: "b", date: "2026-10-01", count: 2 },
    ]);
    await db.collection("careerprofiles").insertMany([
        { userId: "a", aiEnabled: true, remindersEnabled: true },
        { userId: "b", aiEnabled: true, remindersEnabled: false },
    ]);
    await db.collection("userplans").insertMany([{ userId: "a", plan: "pro" }, { userId: "b", plan: "free" }]);
}, 120_000);

afterAll(stopMemoryMongo);

describe("usage report", () => {
    it("counts users, activity, retention and AI usage without reading content", async () => {
        const report = await usageReport(mongoose.connection.db, NOW);
        expect(report).toEqual({
            users: 4,
            activeUsers7d: 2, // a (job), d (note)
            activeUsers30d: 3, // + b
            returningUsers: 1, // a
            jobs: 4,
            notes: 1,
            offers: 1,
            proUsers: 1,
            aiOptedIn: 2,
            prepsTotal: 5,
            preps7d: 3,
            prepUsers: 2,
            reminderOptOuts: 1,
        });
    });
});
