import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen } from "../test/render";
import PrepPanel from "./PrepPanel";
import type { PrepResult } from "../lib/ai-client";

const CONSENT =
    "Your job descriptions and interview notes will be sent to OpenAI to build your prep. You can turn this off any time.";
const CAP = "You've used today's 5 preps, resets tomorrow";

const RESULT: PrepResult = {
    insufficientData: false,
    message: "",
    likelyQuestions: [
        {
            question: "How would you design a cache?",
            why: "You flagged caching last time.",
            citations: [{ sourceType: "note", sourceId: "n1", jobId: "j9", title: "Notion system design" }],
        },
    ],
    weakSpots: [
        {
            topic: "Complexity analysis",
            detail: "Ran out of time.",
            citations: [{ sourceType: "job_description", sourceId: "j1", jobId: "j1", title: "This job" }],
        },
    ],
    studyPlan: [
        {
            item: "Practice edge cases",
            citations: [{ sourceType: "job_notes", sourceId: "j2", jobId: "j2", title: "Other job" }],
        },
    ],
};

function json(body: unknown, status = 200) {
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

/** Route-by-URL fetch stub. */
function stubFetch(routes: Record<string, () => Promise<Response>>) {
    const fn = vi.fn((url: string) => {
        const route = routes[url];
        if (!route) throw new Error("unexpected fetch " + url);
        return route();
    });
    vi.stubGlobal("fetch", fn);
    return fn;
}

const READY = { configured: true, enabled: true, remaining: 5 };

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("PrepPanel", () => {
    it("renders nothing when AI is not configured", async () => {
        const fetchFn = stubFetch({ "/api/ai/status": () => json({ configured: false, enabled: false, remaining: 5 }) });
        renderWithTheme(<PrepPanel jobId="j1" />);
        await waitFor(() => expect(fetchFn).toHaveBeenCalled());
        await act(async () => {});
        expect(screen.queryByRole("heading")).toBeNull();
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("shows the consent copy when not enabled", async () => {
        stubFetch({ "/api/ai/status": () => json({ configured: true, enabled: false, remaining: 5 }) });
        renderWithTheme(<PrepPanel jobId="j1" />);
        expect(await screen.findByText(CONSENT)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Turn on AI prep" })).toBeInTheDocument();
    });

    it("enables, then refetches status and shows the ready state", async () => {
        let enabled = false;
        stubFetch({
            "/api/ai/status": () => json({ configured: true, enabled, remaining: 5 }),
            "/api/ai/enable": () => {
                enabled = true;
                return json({ enabled: true });
            },
        });
        renderWithTheme(<PrepPanel jobId="j1" />);
        await userEvent.click(await screen.findByRole("button", { name: "Turn on AI prep" }));
        expect(await screen.findByRole("button", { name: "Prep for this interview" })).toBeInTheDocument();
        expect(screen.getByText("5 of 5 preps left today")).toBeInTheDocument();
    });

    it("shows an enable error inline", async () => {
        stubFetch({
            "/api/ai/status": () => json({ configured: true, enabled: false, remaining: 5 }),
            "/api/ai/enable": () => json({ error: "Could not send your data to the AI service. Please try again." }, 502),
        });
        renderWithTheme(<PrepPanel jobId="j1" />);
        await userEvent.click(await screen.findByRole("button", { name: "Turn on AI prep" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Could not send your data");
    });

    it("renders cited results with note links", async () => {
        const fetchFn = stubFetch({
            "/api/ai/status": () => json(READY),
            "/api/ai/prep": () => json({ result: RESULT, remaining: 4 }),
        });
        renderWithTheme(<PrepPanel jobId="j1" />);
        await userEvent.type(await screen.findByPlaceholderText("e.g. system design round"), "system design");
        await userEvent.click(screen.getByRole("button", { name: "Prep for this interview" }));

        const noteLink = await screen.findByRole("link", { name: "Notion system design" });
        expect(noteLink).toHaveAttribute("href", "/dashboard/notes/n1");
        // Another job's source links to that job; this job's source scrolls to the description.
        expect(screen.getByRole("link", { name: "Other job" })).toHaveAttribute("href", "/dashboard/jobs/j2");
        expect(screen.getByRole("link", { name: "This job" })).toHaveAttribute("href", "#job-description");
        expect(screen.getByRole("heading", { name: "Likely questions" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Weak spots" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Study plan" })).toBeInTheDocument();
        expect(screen.getByText("4 of 5 preps left today")).toBeInTheDocument();

        const prepCall = fetchFn.mock.calls.find((c) => c[0] === "/api/ai/prep")!;
        expect(JSON.parse((prepCall as unknown as [string, RequestInit])[1].body as string)).toEqual({ jobId: "j1", focus: "system design" });
    });

    it("shows the message when there is insufficient data", async () => {
        const msg = "Add notes from your rounds to get prep tailored to you";
        stubFetch({
            "/api/ai/status": () => json(READY),
            "/api/ai/prep": () =>
                json({
                    result: { ...RESULT, insufficientData: true, message: msg, likelyQuestions: [], weakSpots: [], studyPlan: [] },
                    remaining: 4,
                }),
        });
        renderWithTheme(<PrepPanel jobId="j1" />);
        await userEvent.click(await screen.findByRole("button", { name: "Prep for this interview" }));
        expect(await screen.findByText(msg)).toBeInTheDocument();
    });

    it("shows the cap copy on a daily-cap 429", async () => {
        stubFetch({
            "/api/ai/status": () => json(READY),
            "/api/ai/prep": () => json({ error: CAP }, 429),
        });
        renderWithTheme(<PrepPanel jobId="j1" />);
        await userEvent.click(await screen.findByRole("button", { name: "Prep for this interview" }));
        expect(await screen.findByText(CAP)).toBeInTheDocument();
    });

    it("shows the rate-limit copy on any other 429", async () => {
        stubFetch({
            "/api/ai/status": () => json(READY),
            "/api/ai/prep": () => json({ error: "Rate limit exceeded" }, 429),
        });
        renderWithTheme(<PrepPanel jobId="j1" />);
        await userEvent.click(await screen.findByRole("button", { name: "Prep for this interview" }));
        expect(await screen.findByText("Too many requests. Please wait a moment and try again.")).toBeInTheDocument();
        expect(screen.queryByText(CAP)).toBeNull();
    });

    it("shows the service message with a retry button on 503", async () => {
        const msg = "The AI service is unavailable right now. Please try again in a minute.";
        stubFetch({
            "/api/ai/status": () => json(READY),
            "/api/ai/prep": () => json({ error: msg }, 503),
        });
        renderWithTheme(<PrepPanel jobId="j1" />);
        await userEvent.click(await screen.findByRole("button", { name: "Prep for this interview" }));
        expect(await screen.findByText(msg)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });

    it("says it is waking the service after 8 seconds", async () => {
        stubFetch({
            "/api/ai/status": () => json(READY),
            "/api/ai/prep": () => new Promise<Response>(() => {}),
        });
        renderWithTheme(<PrepPanel jobId="j1" />);
        const button = await screen.findByRole("button", { name: "Prep for this interview" });
        vi.useFakeTimers();
        await act(async () => {
            button.click();
        });
        expect(screen.getByText("Preparing…")).toBeInTheDocument();
        await act(async () => {
            vi.advanceTimersByTime(8000);
        });
        expect(screen.getByText("Waking up the AI service…")).toBeInTheDocument();
    });

    it("sample mode renders without fetching", () => {
        const fetchFn = vi.fn();
        vi.stubGlobal("fetch", fetchFn);
        renderWithTheme(<PrepPanel sample={RESULT} />);
        expect(screen.getByText("Sample — sign up to prep with your own notes")).toBeInTheDocument();
        expect(screen.getByText("How would you design a cache?")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Prep for this interview" })).toBeNull();
        expect(fetchFn).not.toHaveBeenCalled();
    });
});
