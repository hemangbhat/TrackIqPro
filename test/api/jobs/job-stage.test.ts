// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import Job from "../../../models/Job";
import { startMemoryMongo, stopMemoryMongo } from "../../mongo-memory";
import { filterJobs } from "../../../lib/job-filter";

vi.mock("@clerk/nextjs/server", () => ({ getAuth: vi.fn() }));
vi.mock("../../../lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../lib/ai-sync", () => ({ syncJobSaved: vi.fn(), syncJobDeleted: vi.fn() }));

import { getAuth } from "@clerk/nextjs/server";
import jobsHandler from "../../../pages/api/jobs/index";

function get() {
    const out = { status: 0, body: undefined as any };
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
    return Promise.resolve(jobsHandler({ method: "GET", query: {}, headers: {} } as any, res as any)).then(() => out);
}

beforeAll(async () => {
    await startMemoryMongo();
}, 120_000);

afterAll(stopMemoryMongo);

beforeEach(async () => {
    vi.mocked(getAuth).mockReturnValue({ userId: "u1" } as any);
    await Job.deleteMany({});
});

describe("job stage normalisation", () => {
    it("a legacy 'Applied' record is returned as 'applied', so the Applied filter finds it", async () => {
        // Written straight to the collection, bypassing the schema, like old data.
        await mongoose.connection.db!.collection("jobs").insertOne({
            userId: "u1",
            title: "SDE",
            company: "Google",
            stage: "Applied",
            status: "active",
            dateApplied: new Date(),
        });

        const out = await get();
        expect(out.status).toBe(200);
        expect(out.body[0].stage).toBe("applied");
        expect(filterJobs(out.body, "", "applied")).toHaveLength(1);
    });

    it("new saves are stored lowercase and trimmed", async () => {
        const job = await Job.create({ userId: "u1", title: "SDE", company: "Uber", stage: " Interview " });
        expect(job.stage).toBe("interview");
    });
});
