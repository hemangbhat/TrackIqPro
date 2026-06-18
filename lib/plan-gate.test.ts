// lib/plan-gate.test.ts
import { describe, it, expect } from "vitest";
import {
    canExport,
    canCreateJob,
    isAtJobLimit,
    gateExport,
    gateCreateJob,
    interpretServerRejection,
    isPlanRejection,
    EXPORT_UPGRADE_MESSAGE,
    JOB_LIMIT_UPGRADE_MESSAGE,
} from "./plan-gate";
import { FREE_JOB_LIMIT } from "./plans";

describe("plan-gate export gating", () => {
    it("blocks export for a Free_User (Req 4.1)", () => {
        expect(canExport("free")).toBe(false);
        const d = gateExport("free");
        expect(d.allowed).toBe(false);
        expect(d.reason).toBe("pro-required");
        expect(d.message).toBe(EXPORT_UPGRADE_MESSAGE);
    });

    it("blocks export when plan is unknown/null", () => {
        expect(canExport(null)).toBe(false);
        expect(canExport(undefined)).toBe(false);
    });

    it("enables export for a Pro_User (Req 4.3)", () => {
        expect(canExport("pro")).toBe(true);
        const d = gateExport("pro");
        expect(d.allowed).toBe(true);
        expect(d.message).toBeNull();
    });
});

describe("plan-gate job-create gating", () => {
    it("allows a Free_User below the limit (Req 4.2)", () => {
        expect(canCreateJob("free", FREE_JOB_LIMIT - 1)).toBe(true);
        expect(isAtJobLimit("free", FREE_JOB_LIMIT - 1)).toBe(false);
        expect(gateCreateJob("free", FREE_JOB_LIMIT - 1).allowed).toBe(true);
    });

    it("blocks a Free_User at or over the limit with the upgrade prompt (Req 4.2)", () => {
        expect(canCreateJob("free", FREE_JOB_LIMIT)).toBe(false);
        expect(isAtJobLimit("free", FREE_JOB_LIMIT)).toBe(true);
        const d = gateCreateJob("free", FREE_JOB_LIMIT + 5);
        expect(d.allowed).toBe(false);
        expect(d.reason).toBe("free-limit-reached");
        expect(d.message).toBe(JOB_LIMIT_UPGRADE_MESSAGE);
    });

    it("never applies the limit to a Pro_User (Req 4.4)", () => {
        expect(canCreateJob("pro", FREE_JOB_LIMIT + 1000)).toBe(true);
        expect(isAtJobLimit("pro", FREE_JOB_LIMIT + 1000)).toBe(false);
        expect(gateCreateJob("pro", FREE_JOB_LIMIT + 1000).allowed).toBe(true);
    });
});

describe("plan-gate server authority (Req 4.5, 4.6)", () => {
    it("recognizes 403/402 as plan rejections", () => {
        expect(isPlanRejection(403)).toBe(true);
        expect(isPlanRejection(402)).toBe(true);
        expect(isPlanRejection(500)).toBe(false);
        expect(isPlanRejection(200)).toBe(false);
    });

    it("maps a server rejection to the matching upgrade prompt", () => {
        expect(interpretServerRejection("export")).toEqual({
            action: "export",
            allowed: false,
            reason: "pro-required",
            message: EXPORT_UPGRADE_MESSAGE,
        });
        expect(interpretServerRejection("create-job")).toEqual({
            action: "create-job",
            allowed: false,
            reason: "free-limit-reached",
            message: JOB_LIMIT_UPGRADE_MESSAGE,
        });
    });
});
