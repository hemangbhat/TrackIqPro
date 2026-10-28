// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "events";

const verify = vi.fn();
vi.mock("svix", () => ({ Webhook: vi.fn(function () {
        return { verify };
    }) }));
vi.mock("../../../lib/email", () => ({ sendWelcomeEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../lib/ai-sync", () => ({ syncUserDeleted: vi.fn() }));
vi.mock("../../../lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("../../../models/CareerProfile", () => ({ default: { updateOne: vi.fn() } }));

import { sendWelcomeEmail } from "../../../lib/email";
import { syncUserDeleted } from "../../../lib/ai-sync";
import { connectDB } from "../../../lib/db";
import CareerProfile from "../../../models/CareerProfile";
import handler from "./webhook";

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
});

describe("POST /api/clerk/webhook", () => {
    it("user.deleted removes the user's vectors", async () => {
        verify.mockReturnValue({ type: "user.deleted", data: { id: "user_1" } });
        expect((await post()).status).toBe(200);
        expect(syncUserDeleted).toHaveBeenCalledWith("user_1");
    });

    it("user.deleted turns AI off before purging, so reindex can't re-upload the data", async () => {
        const order: string[] = [];
        updateOne.mockImplementation((async () => {
            order.push("flag off");
            return {};
        }) as never);
        vi.mocked(syncUserDeleted).mockImplementation(() => {
            order.push("purge");
        });
        verify.mockReturnValue({ type: "user.deleted", data: { id: "user_1" } });
        expect((await post()).status).toBe(200);
        expect(updateOne).toHaveBeenCalledWith({ userId: "user_1" }, { $set: { aiEnabled: false } });
        expect(order).toEqual(["flag off", "purge"]);
    });

    it("user.deleted still purges and returns 200 when the database fails", async () => {
        const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(connectDB).mockRejectedValue(new TypeError("db down"));
        verify.mockReturnValue({ type: "user.deleted", data: { id: "user_1" } });
        expect((await post()).status).toBe(200);
        expect(syncUserDeleted).toHaveBeenCalledWith("user_1");
        const logged = errorLog.mock.calls.map((c) => c.join(" ")).join(" | ");
        expect(logged).toContain("user_1");
        expect(logged).toContain("TypeError");
        expect(logged).not.toContain("db down");
        errorLog.mockRestore();
    });

    it("rejects an invalid signature with 400", async () => {
        verify.mockImplementation(() => {
            throw new Error("bad signature");
        });
        expect((await post()).status).toBe(400);
        expect(syncUserDeleted).not.toHaveBeenCalled();
    });

    it("acknowledges an unknown event type with 200", async () => {
        verify.mockReturnValue({ type: "session.created", data: {} });
        expect((await post()).status).toBe(200);
        expect(syncUserDeleted).not.toHaveBeenCalled();
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
        expect(syncUserDeleted).not.toHaveBeenCalled();
    });
});
