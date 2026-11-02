import { describe, expect, it } from "vitest";
import { companyInitial, formatDate, formatDateTime, formatMoney } from "./format";

describe("formatMoney", () => {
    it("formats whole dollars, never showing a stray cent digit", () => {
        expect(formatMoney(1250000)).toBe("$1,250,000");
        expect(formatMoney(98000.5)).toBe("$98,001");
        expect(formatMoney(0)).toBe("$0");
    });
    it("shows a dash for missing or non-finite amounts", () => {
        expect(formatMoney(undefined)).toBe("—");
        expect(formatMoney(null)).toBe("—");
        expect(formatMoney(Number.NaN)).toBe("—");
    });
});

describe("formatDate / formatDateTime", () => {
    it("never renders 'Invalid Date'", () => {
        expect(formatDate("not-a-date")).toBe("—");
        expect(formatDate(undefined)).toBe("—");
        expect(formatDateTime("not-a-date")).toBe("—");
    });
    it("drops seconds from timestamps", () => {
        expect(formatDateTime("2026-03-04T15:07:42")).not.toMatch(/:42/);
    });
});

describe("companyInitial", () => {
    it("skips a leading emoji or symbol", () => {
        expect(companyInitial("🦄 Unicorn Labs")).toBe("U");
        expect(companyInitial("(Stealth) Acme")).toBe("S");
    });
    it("keeps whole non-Latin characters", () => {
        expect(companyInitial("株式会社メルカリ")).toBe("株");
        expect(companyInitial("شركة الاتصالات")).toBe("ش");
        expect(companyInitial("écrit")).toBe("É");
    });
    it("falls back when there is nothing to show", () => {
        expect(companyInitial("")).toBe("?");
        expect(companyInitial("🚀")).toBe("?");
    });
});
