// @vitest-environment node
import { readdirSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Next.js builds every file under pages/ as a route, so a test placed there is
// compiled and deployed as a public URL (e.g. /api/cron/x.test). Route tests
// live in test/api/ instead, mirroring the pages/api folder depth.
describe("pages/ directory", () => {
    it("contains no test files", () => {
        const found = (readdirSync("pages", { recursive: true }) as string[])
            .map((f) => join("pages", f))
            .filter((f) => /\.(test|spec)\.[jt]sx?$/.test(f));
        expect(found).toEqual([]);
    });
});
