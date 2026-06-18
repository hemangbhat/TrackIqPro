import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useNotes } from "./useNotes";
import type { Note } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake fetch Response with the given status + JSON body. */
function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response;
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    _id: "n1",
    title: "Phone screen prep",
    content: "Review system design basics",
    round: "screening",
    jobId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Collect every URL string passed to fetch across all calls. */
function fetchedUrls(mock: ReturnType<typeof vi.fn>): string[] {
  return mock.mock.calls.map((args) => String(args[0]));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  // Default: every call resolves to an empty list so the mount-effect settles.
  fetchMock.mockResolvedValue(jsonResponse([]));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Fetch state transitions
// ---------------------------------------------------------------------------

describe("useNotes - fetch", () => {
  it("starts in a loading state and transitions to ready with fetched notes (Req 11.2, 17.4)", async () => {
    const notes = [makeNote({ _id: "a" }), makeNote({ _id: "b" })];
    fetchMock.mockResolvedValueOnce(jsonResponse(notes));

    const { result } = renderHook(() => useNotes());

    // While the mount request is in flight the hook reports loading and no data.
    expect(result.current.loading).toBe(true);
    expect(result.current.notes).toEqual([]);
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notes).toEqual(notes);
    expect(result.current.error).toBeNull();
  });

  it("fetches from /api/notes on mount without any query parameters", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith("/api/notes");
  });

  it("normalizes a non-array response body to an empty list (Req 17.1)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ unexpected: "shape" }));

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notes).toEqual([]);
  });

  it("sets an error and clears loading when the fetch response is not ok (Req 17.6)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([], false));

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to load notes");
    expect(result.current.notes).toEqual([]);
  });

  it("sets an error when fetch rejects (network failure)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("boom");
  });

  it("clears a prior error when a subsequent fetch succeeds", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([], false));
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.error).toBe("Failed to load notes"));

    const notes = [makeNote()];
    fetchMock.mockResolvedValueOnce(jsonResponse(notes));
    await act(async () => {
      await result.current.fetchNotes();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.notes).toEqual(notes);
  });
});

// ---------------------------------------------------------------------------
// Optional jobId filter
// ---------------------------------------------------------------------------

describe("useNotes - jobId filter", () => {
  it("requests /api/notes?jobId=<id> when a jobId is supplied (Req 11.2)", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const scoped = [makeNote({ _id: "scoped", jobId: "job-123" })];
    fetchMock.mockResolvedValueOnce(jsonResponse(scoped));
    await act(async () => {
      await result.current.fetchNotes("job-123");
    });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/notes?jobId=job-123");
    expect(result.current.notes).toEqual(scoped);
  });

  it("url-encodes the jobId value used in the query string", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchNotes("a b/c&d");
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/notes?jobId=${encodeURIComponent("a b/c&d")}`
    );
  });
});

// ---------------------------------------------------------------------------
// Create / update / delete state transitions
// ---------------------------------------------------------------------------

describe("useNotes - createNote", () => {
  it("prepends the created note to state and returns it (Req 11.2)", async () => {
    const existing = makeNote({ _id: "old" });
    fetchMock.mockResolvedValueOnce(jsonResponse([existing]));
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toEqual([existing]));

    const created = makeNote({ _id: "new", title: "Fresh note" });
    fetchMock.mockResolvedValueOnce(jsonResponse(created));

    let returned: Note | undefined;
    await act(async () => {
      returned = await result.current.createNote({ title: "Fresh note", content: "x" });
    });

    expect(returned).toEqual(created);
    expect(result.current.notes).toEqual([created, existing]);

    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe("/api/notes");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("throws and leaves state unchanged when creation fails (Req 17.6)", async () => {
    const existing = makeNote({ _id: "old" });
    fetchMock.mockResolvedValueOnce(jsonResponse([existing]));
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toEqual([existing]));

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "nope" }, false));

    await expect(
      act(async () => {
        await result.current.createNote({ title: "bad" });
      })
    ).rejects.toThrow("nope");

    expect(result.current.notes).toEqual([existing]);
  });
});

describe("useNotes - updateNote", () => {
  it("replaces the matching note in state and returns the updated note", async () => {
    const a = makeNote({ _id: "a", title: "A" });
    const b = makeNote({ _id: "b", title: "B" });
    fetchMock.mockResolvedValueOnce(jsonResponse([a, b]));
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toEqual([a, b]));

    const updated = makeNote({ _id: "b", title: "B updated" });
    fetchMock.mockResolvedValueOnce(jsonResponse(updated));

    let returned: Note | undefined;
    await act(async () => {
      returned = await result.current.updateNote("b", { title: "B updated" });
    });

    expect(returned).toEqual(updated);
    expect(result.current.notes).toEqual([a, updated]);

    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe("/api/notes/b");
    expect((init as RequestInit).method).toBe("PUT");
  });

  it("throws and preserves state when an update fails (Req 17.6)", async () => {
    const a = makeNote({ _id: "a", title: "A" });
    fetchMock.mockResolvedValueOnce(jsonResponse([a]));
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toEqual([a]));

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "denied" }, false));

    await expect(
      act(async () => {
        await result.current.updateNote("a", { title: "x" });
      })
    ).rejects.toThrow("denied");

    expect(result.current.notes).toEqual([a]);
  });
});

describe("useNotes - deleteNote", () => {
  it("removes the matching note from state on success", async () => {
    const a = makeNote({ _id: "a" });
    const b = makeNote({ _id: "b" });
    fetchMock.mockResolvedValueOnce(jsonResponse([a, b]));
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toEqual([a, b]));

    fetchMock.mockResolvedValueOnce(jsonResponse({}, true));
    await act(async () => {
      await result.current.deleteNote("a");
    });

    expect(result.current.notes).toEqual([b]);

    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe("/api/notes/a");
    expect((init as RequestInit).method).toBe("DELETE");
  });

  it("throws and preserves state when a delete fails (Req 17.6)", async () => {
    const a = makeNote({ _id: "a" });
    fetchMock.mockResolvedValueOnce(jsonResponse([a]));
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toEqual([a]));

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "cannot delete" }, false));

    await expect(
      act(async () => {
        await result.current.deleteNote("a");
      })
    ).rejects.toThrow("cannot delete");

    expect(result.current.notes).toEqual([a]);
  });
});

// ---------------------------------------------------------------------------
// Data isolation: no client-side user-identifying value scopes queries
// (Req 17.2)
// ---------------------------------------------------------------------------

describe("useNotes - data isolation (Req 17.2)", () => {
  // Tokens that would indicate the hook is scoping queries with a client-side
  // user-identifying value instead of relying on the authenticated session.
  const FORBIDDEN_SCOPING_TOKENS = [
    "userid",
    "user_id",
    "user-id",
    "email",
    "username",
    "token",
    "session",
    "cookie",
    "auth",
  ];

  it("only ever calls the notes API endpoints, with at most a jobId query param", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchNotes("job-7");
    });
    await act(async () => {
      await result.current.createNote({ title: "t", content: "c" });
    });
    await act(async () => {
      await result.current.updateNote("id1", { title: "t2" });
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, true));
    await act(async () => {
      await result.current.deleteNote("id1");
    });

    const allowed = /^\/api\/notes(\/[^/?]+)?(\?jobId=[^&]*)?$/;
    for (const url of fetchedUrls(fetchMock)) {
      expect(url, `unexpected URL shape: ${url}`).toMatch(allowed);
    }
  });

  it("never embeds a user-identifying value in any request URL", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchNotes("job-7");
    });

    for (const url of fetchedUrls(fetchMock)) {
      const lower = url.toLowerCase();
      for (const token of FORBIDDEN_SCOPING_TOKENS) {
        expect(lower.includes(token), `URL "${url}" must not scope by "${token}"`).toBe(false);
      }
    }
  });

  it("does not read browser identity sources (cookie / localStorage / URL) to scope queries", async () => {
    const cookieSpy = vi.fn(() => "");
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: cookieSpy,
      set: () => {},
    });
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchNotes("job-7");
    });

    expect(cookieSpy).not.toHaveBeenCalled();
    expect(getItemSpy).not.toHaveBeenCalled();

    getItemSpy.mockRestore();
  });
});
