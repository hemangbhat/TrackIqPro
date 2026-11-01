// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const batchSend = vi.fn();
vi.mock("resend", () => ({
    Resend: vi.fn(function () {
        return { batch: { send: batchSend }, emails: { send: vi.fn() } };
    }),
}));

async function load() {
    vi.resetModules();
    process.env.RESEND_API_KEY = "re_test";
    return import("./email");
}

const digest = (to: string) => ({
    to,
    items: [{ title: "Engineer", company: "Co", stage: "applied", action: "Follow up", daysStale: 9, impact: "high" as const }],
});

beforeEach(() => {
    batchSend.mockReset();
    batchSend.mockResolvedValue({ data: {}, error: null });
});

describe("sendFollowUpDigests", () => {
    it("sends at most 100 emails per Resend call", async () => {
        const { sendFollowUpDigests } = await load();
        const sent = await sendFollowUpDigests(Array.from({ length: 230 }, (_, i) => digest(`u${i}@x.test`)));

        expect(batchSend.mock.calls.map(([batch]) => batch.length)).toEqual([100, 100, 30]);
        expect(sent).toBe(230);
    });

    it("counts only accepted batches and keeps going after a failed one", async () => {
        const { sendFollowUpDigests } = await load();
        batchSend
            .mockResolvedValueOnce({ data: null, error: { message: "rate limited" } })
            .mockResolvedValueOnce({ data: {}, error: null });
        vi.spyOn(console, "error").mockImplementation(() => {});

        expect(await sendFollowUpDigests(Array.from({ length: 150 }, (_, i) => digest(`u${i}@x.test`)))).toBe(50);
        expect(batchSend).toHaveBeenCalledTimes(2);
    });

    it("skips digests with nothing to follow up", async () => {
        const { sendFollowUpDigests } = await load();
        expect(await sendFollowUpDigests([{ to: "a@x.test", items: [] }])).toBe(0);
        expect(batchSend).not.toHaveBeenCalled();
    });

    it("adds the unsubscribe footer link and one-click headers when links are given", async () => {
        const { sendFollowUpDigests } = await load();
        await sendFollowUpDigests([
            {
                ...digest("a@x.test"),
                unsubscribe: { page: "https://app.test/unsubscribe?u=a&t=b", oneClick: "https://app.test/api/email/unsubscribe?u=a&t=b" },
            },
        ]);
        const [email] = batchSend.mock.calls[0][0];
        expect(email.html).toContain('href="https://app.test/unsubscribe?u=a&amp;t=b"');
        expect(email.headers).toEqual({
            "List-Unsubscribe": "<https://app.test/api/email/unsubscribe?u=a&t=b>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        });
    });
});

