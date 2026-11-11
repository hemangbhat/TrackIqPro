// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "events";

const verify = vi.fn();
vi.mock("svix", () => ({ Webhook: vi.fn(function () {
        return { verify };
    }) }));
vi.mock("../../../lib/email", () => ({ sendWelcomeEmail: vi.fn().mockResolvedValue({ sent: true }) }));
vi.mock("../../../lib/ai-sync", () => ({ purgeUserVectors: vi.fn() }));
vi.mock("../../../lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("../../../models/CareerProfile", () => ({ default: { updateOne: vi.fn() } }));
vi.mock("../../../lib/account-deletion", () => ({ deleteAccountData: vi.fn() }));

import { sendWelcomeEmail } from "../../../lib/email";
import { purgeUserVectors } from "../../../lib/ai-sync";
import { connectDB } from "../../../lib/db";
import CareerProfile from "../../../models/CareerProfile";
import { deleteAccountData } from "../../../lib/account-deletion";
import handler from "../../../pages/api/clerk/webhook";

/** A POST request that streams a body, and a res that records status/json. */
async function post() {
    const req = Object.assign(new EventEmitter(), { method: "POST", headers: {} });
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
    const done = handler(req as never, res as never);
    req.emit("data", Buffer.from("{}"));
    req.emit("end");
    await done;
    return out;
}

const updateOne = vi.mocked(CareerProfile.updateOne);

beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = "whsec_test";
    vi.mocked(connectDB).mockResolvedValue(undefined as never);
    updateOne.mockResolvedValue({} as never);
    vi.mocked(deleteAccountData).mockResolvedValue(undefined);
    vi.mocked(purgeUserVectors).mockResolvedValue(undefined);
});

const purge = vi.mocked(purgeUserVectors);

describe("POST /api/clerk/webhook", () => {
    it("user.deleted removes the user's vectors", async () => {
        verify.mockReturnValue({ type: "user.deleted", data: { id: "user_1" } });
        expect((await post()).status).toBe(200);
        expect(purge).toHaveBeenCalledWith("user_1");
    });

    it("user.deleted turns AI off before purging, so reindex can't re-upload the data", async () => {
        const order: string[] = [];
        updateOne.mockImplementation((async () => {
            order.push("flag off");
            return {};
        }) as never);
        purge.mockImplementation(async () => {
            order.push("purge");
        });
        vi.mocked(deleteAccountData).mockImplementation(async () => {
            order.push("erase");
        });
        verify.mockReturnValue({ type: "user.deleted", data: { id: "user_1" } });
        expect((await post()).status).toBe(200);
        expect(updateOne).toHaveBeenCalledWith(
            { userId: "user_1" },
            { $set: { aiEnabled: false, aiIndexedAt: null } }
        );
        expect(order).toEqual(["flag off", "purge", "erase"]);
    });

    it("user.deleted still purges, but returns 500 so Clerk retries, when the database fails", async () => {
        const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(connectDB).mockRejectedValue(new TypeError("db down"));
        verify.mockReturnValue({ type: "user.deleted", data: { id: "user_1" } });
        expect((await post()).status).toBe(500);
        expect(purge).toHaveBeenCalledWith("user_1");
        const logged = errorLog.mock.calls.map((c) => c.join(" ")).join(" | ");
        expect(logged).toContain("user_1");
        expect(logged).toContain("TypeError");
        expect(logged).not.toContain("db down");
        errorLog.mockRestore();
    });

    it("user.deleted erases the account's data and billing", async () => {
        verify.mockReturnValue({ type: "user.deleted", data: { id: "user_1" } });
        expect((await post()).status).toBe(200);
        expect(deleteAccountData).toHaveBeenCalledWith("user_1");
    });

    it("user.deleted returns 500 when erasure fails, so Clerk retries", async () => {
        const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(deleteAccountData).mockRejectedValue(new Error("stripe down"));
        verify.mockReturnValue({ type: "user.deleted", data: { id: "user_1" } });
        expect((await post()).status).toBe(500);
        // The vector purge was still started.
        expect(purge).toHaveBeenCalledWith("user_1");
        errorLog.mockRestore();
    });

    it("user.deleted returns 500 when the vector purge fails, but still erases Mongo data", async () => {
        const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
        purge.mockRejectedValue(new Error("ai asleep"));
        verify.mockReturnValue({ type: "user.deleted", data: { id: "user_1" } });
        const out = await post();
        expect(out.status).toBe(500);
        expect(out.body).toMatchObject({ failed: ["ai vectors"] });
        expect(deleteAccountData).toHaveBeenCalledWith("user_1");
        errorLog.mockRestore();
    });

    it("logs a failed welcome email without failing the webhook", async () => {
        const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(sendWelcomeEmail).mockResolvedValueOnce({ sent: false, error: "domain not verified" });
        verify.mockReturnValue({
            type: "user.created",
            data: { id: "user_3", email_addresses: [{ id: "e1", email_address: "x@example.com" }] },
        });
        expect((await post()).status).toBe(200);
        const logged = errorLog.mock.calls.map((c) => c.join(" ")).join(" | ");
        expect(logged).toContain("user_3");
        expect(logged).toContain("domain not verified");
        expect(logged).not.toContain("x@example.com");
        errorLog.mockRestore();
    });

    it("rejects an invalid signature with 400", async () => {
        verify.mockImplementation(() => {
            throw new Error("bad signature");
        });
        expect((await post()).status).toBe(400);
        expect(purge).not.toHaveBeenCalled();
    });

    it("acknowledges an unknown event type with 200", async () => {
        verify.mockReturnValue({ type: "session.created", data: {} });
        expect((await post()).status).toBe(200);
        expect(purge).not.toHaveBeenCalled();
        expect(sendWelcomeEmail).not.toHaveBeenCalled();
    });

    it("user.created still sends the welcome email", async () => {
        verify.mockReturnValue({
            type: "user.created",
            data: {
                id: "user_2",
                first_name: "Ada",
                primary_email_address_id: "e1",
                email_addresses: [{ id: "e1", email_address: "ada@example.com" }],
            },
        });
        expect((await post()).status).toBe(200);
        expect(sendWelcomeEmail).toHaveBeenCalledWith({ to: "ada@example.com", firstName: "Ada" });
        expect(purge).not.toHaveBeenCalled();
    });
});
