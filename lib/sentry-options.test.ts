// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrubEvent, sentryOptions } from "./sentry-options";

describe("sentry options", () => {
    it("is disabled without a DSN", () => {
        expect(sentryOptions(undefined).enabled).toBe(false);
        expect(sentryOptions("https://k@o1.ingest.sentry.io/1").enabled).toBe(true);
        expect(sentryOptions("https://k@o1.ingest.sentry.io/1").sendDefaultPii).toBe(false);
    });

    it("strips request bodies, headers, cookies, query and user before sending", () => {
        const event = {
            type: undefined,
            message: "boom",
            request: {
                url: "https://app.test/api/notes",
                method: "POST",
                data: { content: "Private interview notes" },
                headers: { authorization: "Bearer x" },
                cookies: { __session: "jwt" },
                query_string: "u=user_1&t=token",
            },
            user: { id: "user_1", email: "a@x.test" },
        } as unknown as ErrorEvent;

        const out = scrubEvent(event);
        expect(out.request).toEqual({ url: "https://app.test/api/notes", method: "POST" });
        expect(out.user).toBeUndefined();
        expect(out.message).toBe("boom");
    });
});
