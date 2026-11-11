// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserList = vi.fn();
const redisSet = vi.fn();
const redisDel = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
    clerkClient: vi.fn(async () => ({ users: { getUserList } })),
}));
vi.mock("@upstash/redis", () => ({
    Redis: vi.fn(function () {
        return { set: redisSet, del: redisDel };
    }),
}));
vi.mock("../../../lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("../../../lib/email", () => ({
    emailEnabled: true,
    DIGEST_BATCH_SIZE: 100,
    sendFollowUpDigests: vi.fn(async (digests: unknown[]) => digests.length),
}));
vi.mock("../../../lib/follow-up-intelligence", () => ({
    getPriorityQueue: vi.fn((jobs: { title: string; company: string }[]) =>
        jobs.map((j) => ({ ...j, stage: "applied", action: "Follow up", daysStale: 9, impact: "high" }))
    ),
}));
const jobFind = vi.fn();
vi.mock("../../../models/Job", () => ({
    default: { find: (...args: unknown[]) => jobFind(...args) },
}));

// Users who unsubscribed (remindersEnabled: false), per test.
let optedOut: string[] = [];
vi.mock("../../../models/CareerProfile", () => ({
    default: {
        find: () => ({ select: () => ({ lean: async () => optedOut.map((userId) => ({ userId })) }) }),
    },
}));

import { sendFollowUpDigests } from "../../../lib/email";
import { verifyUnsubscribeToken } from "../../../lib/unsubscribe";
import handler from "../../../pages/api/cron/follow-up-reminders";

function run(auth = "Bearer cron-secret") {
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
    return handler({ method: "GET", headers: { authorization: auth } } as never, res as never).then(
        () => out
    );
}

/** One active job each for users u0..u(n-1). */
function activeJobsFor(n: number) {
    const jobs = Array.from({ length: n }, (_, i) => ({
        _id: `job${i}`,
        userId: `u${i}`,
        title: "Engineer",
        company: `Co${i}`,
        status: "active",
    }));
    jobFind.mockReturnValue({ select: () => ({ limit: () => ({ lean: async () => jobs }) }) });
}

/** Clerk returns every requested user except the ones in `missing`. */
function clerkKnowsAllExcept(missing: Set<string> = new Set()) {
    getUserList.mockImplementation(async ({ userId }: { userId: string[] }) => ({
        data: userId
            .filter((id) => !missing.has(id))
            .map((id) => ({ id, firstName: "A", primaryEmailAddress: { emailAddress: `${id}@x.test` } })),
    }));
}

beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
    optedOut = [];
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe("GET /api/cron/follow-up-reminders", () => {
    it("rejects a wrong secret", async () => {
        expect((await run("Bearer nope")).status).toBe(401);
        expect(jobFind).not.toHaveBeenCalled();
    });

    it("looks users up and sends in batches of 100, not one call per user", async () => {
        activeJobsFor(250);
        clerkKnowsAllExcept();
        const out = await run();

        expect(out.status).toBe(200);
        expect(getUserList).toHaveBeenCalledTimes(3);
        for (const [args] of getUserList.mock.calls) expect(args.userId.length).toBeLessThanOrEqual(100);
        expect(sendFollowUpDigests).toHaveBeenCalledTimes(3);
        expect(out.body).toMatchObject({ usersScanned: 250, usersWithFollowUps: 250, emailsSent: 250 });
    });

    it("skips users Clerk no longer has, and users already reminded today", async () => {
        process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
        process.env.UPSTASH_REDIS_REST_TOKEN = "t";
        activeJobsFor(3);
        clerkKnowsAllExcept(new Set(["u1"]));
        // u2 was already reminded within the cooldown: SET NX returns null.
        redisSet.mockImplementation(async (key: string) => (key === "reminded:u2" ? null : "OK"));

        const out = await run();

        expect(redisSet.mock.calls.map((c) => c[0])).toEqual(["reminded:u0", "reminded:u1", "reminded:u2"]);
        expect(getUserList).toHaveBeenCalledWith(expect.objectContaining({ userId: ["u0", "u1"] }));
        const digests = vi.mocked(sendFollowUpDigests).mock.calls[0][0];
        expect(digests.map((d) => d.to)).toEqual(["u0@x.test"]);
        expect(out.body).toMatchObject({ emailsSent: 1 });
    });

    it("releases the claims and reports failure when a batch's send fails", async () => {
        process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
        process.env.UPSTASH_REDIS_REST_TOKEN = "t";
        activeJobsFor(2);
        clerkKnowsAllExcept();
        redisSet.mockResolvedValue("OK");
        vi.mocked(sendFollowUpDigests).mockResolvedValueOnce(0);

        const out = await run();

        // Released, so these users are reminded on the next run, not in 20h.
        expect(redisDel).toHaveBeenCalledWith("reminded:u0", "reminded:u1");
        expect(out.status).toBe(500);
        expect(out.body).toMatchObject({ ok: false, failedBatches: 1, emailsSent: 0 });
    });

    it("releases the claims when the Clerk lookup fails", async () => {
        process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
        process.env.UPSTASH_REDIS_REST_TOKEN = "t";
        activeJobsFor(1);
        redisSet.mockResolvedValue("OK");
        getUserList.mockRejectedValueOnce(new Error("clerk down"));

        const out = await run();

        expect(redisDel).toHaveBeenCalledWith("reminded:u0");
        expect(sendFollowUpDigests).not.toHaveBeenCalled();
        expect(out.status).toBe(500);
    });

    it("skips users who unsubscribed and gives everyone else a signed unsubscribe link", async () => {
        activeJobsFor(3);
        clerkKnowsAllExcept();
        optedOut = ["u1"];

        await run();

        expect(getUserList).toHaveBeenCalledWith(expect.objectContaining({ userId: ["u0", "u2"] }));
        const digests = vi.mocked(sendFollowUpDigests).mock.calls[0][0];
        expect(digests.map((d) => d.to)).toEqual(["u0@x.test", "u2@x.test"]);
        const page = new URL(digests[0].unsubscribe!.page);
        expect(page.origin).toBe("https://app.test");
        expect(page.searchParams.get("u")).toBe("u0");
        expect(verifyUnsubscribeToken("u0", page.searchParams.get("t"))).toBe(true);
    });
});
