// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { unsubscribeLinks, unsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe";

afterEach(() => {
    process.env.CRON_SECRET = "cron-secret";
});

describe("unsubscribe tokens", () => {
    it("verifies a token only for the user it was issued to", () => {
        process.env.CRON_SECRET = "cron-secret";
        const token = unsubscribeToken("user_1")!;
        expect(verifyUnsubscribeToken("user_1", token)).toBe(true);
        expect(verifyUnsubscribeToken("user_2", token)).toBe(false);
        expect(verifyUnsubscribeToken("user_1", token.slice(0, -1) + "x")).toBe(false);
        expect(verifyUnsubscribeToken("user_1", undefined)).toBe(false);
    });

    it("changes when the secret changes, and never contains the secret", () => {
        process.env.CRON_SECRET = "cron-secret";
        const a = unsubscribeToken("user_1")!;
        process.env.CRON_SECRET = "rotated";
        expect(unsubscribeToken("user_1")).not.toBe(a);
        expect(verifyUnsubscribeToken("user_1", a)).toBe(false);
        expect(a).not.toContain("cron-secret");
    });

    it("issues nothing when no secret is configured", () => {
        delete process.env.CRON_SECRET;
        expect(unsubscribeToken("user_1")).toBeNull();
        expect(unsubscribeLinks("https://app.test", "user_1")).toBeNull();
    });

    it("builds the confirm-page and one-click links", () => {
        process.env.CRON_SECRET = "cron-secret";
        const links = unsubscribeLinks("https://app.test/", "user_1")!;
        const page = new URL(links.page);
        expect(page.pathname).toBe("/unsubscribe");
        expect(verifyUnsubscribeToken(page.searchParams.get("u"), page.searchParams.get("t"))).toBe(true);
        expect(new URL(links.oneClick).pathname).toBe("/api/email/unsubscribe");
    });
});
