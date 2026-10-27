import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    AiNotConfiguredError,
    AiServiceError,
    aiConfigured,
    deleteSources,
    deleteUserVectors,
    indexSources,
    pingHealth,
    requestPrep,
} from "./ai-client";

const fetchMock = vi.fn();

const PREP_INPUT = {
    userId: "u1",
    jobId: "j",
    jobTitle: "t",
    company: "c",
    focus: "",
    profile: { skills: [], targetRole: "", seniority: "mid" },
};

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("AI_SERVICE_URL", "http://ai.test");
    vi.stubEnv("AI_SERVICE_SECRET", "s3cret");
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("ai-client", () => {
    it("sends the secret header and JSON body", async () => {
        fetchMock.mockResolvedValue(jsonResponse({ indexed: 0 }));
        await indexSources("u1", []);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("http://ai.test/index");
        expect(init.method).toBe("POST");
        expect(init.headers["X-AI-Service-Key"]).toBe("s3cret");
        expect(JSON.parse(init.body)).toEqual({ userId: "u1", sources: [] });
    });

    it("makes no network call when AI_SERVICE_URL is unset", async () => {
        vi.stubEnv("AI_SERVICE_URL", "");
        expect(aiConfigured()).toBe(false);
        await indexSources("u1", []);
        await deleteSources("u1", []);
        await deleteUserVectors("u1");
        expect(await pingHealth()).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("requestPrep throws AiNotConfiguredError when unconfigured", async () => {
        vi.stubEnv("AI_SERVICE_SECRET", "");
        await expect(requestPrep(PREP_INPUT)).rejects.toBeInstanceOf(AiNotConfiguredError);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws AiServiceError with the status on non-2xx", async () => {
        fetchMock.mockImplementation(async () => jsonResponse({ detail: "no" }, 401));
        await expect(deleteUserVectors("u1")).rejects.toMatchObject({
            name: "AiServiceError",
            status: 401,
        });
        await expect(deleteUserVectors("u1")).rejects.toBeInstanceOf(AiServiceError);
    });

    it("wraps network failures in AiServiceError with status 0", async () => {
        fetchMock.mockRejectedValue(new TypeError("fetch failed"));
        await expect(requestPrep(PREP_INPUT)).rejects.toMatchObject({
            name: "AiServiceError",
            status: 0,
        });
    });

    it("returns the PrepResult from /prep", async () => {
        const result = {
            insufficientData: true,
            message: "m",
            likelyQuestions: [],
            weakSpots: [],
            studyPlan: [],
        };
        fetchMock.mockResolvedValue(jsonResponse(result));
        expect(await requestPrep(PREP_INPUT)).toEqual(result);
        expect(fetchMock.mock.calls[0][0]).toBe("http://ai.test/prep");
    });

    it("pingHealth reports true on 200 and false on failure", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok" }));
        expect(await pingHealth()).toBe(true);
        fetchMock.mockRejectedValueOnce(new Error("down"));
        expect(await pingHealth()).toBe(false);
    });

    it("encodes the user id in the delete URL", async () => {
        fetchMock.mockResolvedValue(jsonResponse({ deleted: true }));
        await deleteUserVectors("user 1");
        expect(fetchMock.mock.calls[0][0]).toBe("http://ai.test/users/user%201");
        expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    });
});
