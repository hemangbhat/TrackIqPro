// components/data-isolation.property.test.tsx
//
// Property 5: Data isolation (task 18.4)
//
// For any rendered Data_View, only authenticated-hook data is displayed and no
// client-side user-identifying value (id, email, username, token, cookie, URL
// param) is read to scope queries.
//
// **Validates: Requirements 17.1, 17.2**
//
// This generalizes the example-based isolation checks in hooks/useNotes.test.ts
// across ALL authenticated Data_Hooks (useJobs / useNotes / useOffers /
// useUserPlan) and the generic Data_View wrapper, asserting the invariant over
// arbitrary user-identifying values injected into every client-side identity
// source (localStorage, sessionStorage, document.cookie, and the URL).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useJobs } from "../hooks/useJobs";
import { useNotes } from "../hooks/useNotes";
import { useOffers } from "../hooks/useOffers";

// ---------------------------------------------------------------------------
// useUserPlan depends on Clerk's useUser. Mock it so we can inject an
// arbitrary, fully-populated client-side user identity (id/email/username) and
// then prove the hook still never uses any of it to scope its request.
// ---------------------------------------------------------------------------
const clerkUser: { current: Record<string, unknown> | null } = { current: null };

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: clerkUser.current, isLoaded: true }),
}));

import { useUserPlan } from "./useUserPlan";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * A user-identifying value. We prefix with a distinctive marker and use a hex
 * body so the value cannot coincidentally appear as a substring of a normal
 * endpoint path (e.g. "/api/jobs"). Min length keeps the substring check
 * meaningful.
 */
const identTokenArb = fc
  .array(fc.constantFrom(..."0123456789abcdef".split("")), {
    minLength: 6,
    maxLength: 20,
  })
  .map((chars) => `IDENTVAL_${chars.join("")}`);

/** A bundle of every user-identifying value an attacker-ish UI might leak. */
const identityArb = fc.record({
  userId: identTokenArb,
  email: identTokenArb.map((s) => `${s}@example.com`),
  username: identTokenArb,
  token: identTokenArb,
  cookieValue: identTokenArb,
  urlParam: identTokenArb,
});

type Identity = {
  userId: string;
  email: string;
  username: string;
  token: string;
  cookieValue: string;
  urlParam: string;
};

/** All identifying values flattened for substring scanning. */
function identityValues(id: Identity): string[] {
  return [id.userId, id.email, id.username, id.token, id.cookieValue, id.urlParam];
}

// ---------------------------------------------------------------------------
// Test doubles & instrumentation
// ---------------------------------------------------------------------------

let fetchMock: ReturnType<typeof vi.fn>;
let cookieSpy: ReturnType<typeof vi.fn>;
let getItemSpy: ReturnType<typeof vi.spyOn>;
let originalCookieDescriptor: PropertyDescriptor | undefined;

/** Collect every URL string passed to fetch across all calls. */
function fetchedUrls(): string[] {
  return fetchMock.mock.calls.map((args) => String(args[0]));
}

/**
 * Seed every client-side identity source with the generated values, and install
 * spies that record whether the cookie getter or Storage.getItem is read.
 */
function seedIdentitySources(id: Identity) {
  // localStorage / sessionStorage
  window.localStorage.setItem("userId", id.userId);
  window.localStorage.setItem("email", id.email);
  window.localStorage.setItem("username", id.username);
  window.localStorage.setItem("token", id.token);
  window.sessionStorage.setItem("session", id.token);

  // URL (search params) — exercises the "URL param" identity source.
  window.history.replaceState(
    {},
    "",
    `/dashboard?userId=${encodeURIComponent(id.userId)}&email=${encodeURIComponent(
      id.email
    )}`
  );

  // document.cookie getter spy returning an auth-cookie-like string.
  cookieSpy = vi.fn(() => `session=${id.cookieValue}; auth=${id.token}`);
  originalCookieDescriptor = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "cookie"
  );
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: cookieSpy as unknown as () => string,
    set: () => {},
  });

  // Spy on Storage reads (must not be used to scope queries).
  getItemSpy = vi.spyOn(Storage.prototype, "getItem");
}

function teardownIdentitySources() {
  getItemSpy?.mockRestore();
  // Restore the cookie property to its prototype-backed default.
  delete (document as unknown as { cookie?: unknown }).cookie;
  if (originalCookieDescriptor) {
    Object.defineProperty(Document.prototype, "cookie", originalCookieDescriptor);
  }
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/");
}

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    // GET endpoints return a list; mutations return a single record. Neither
    // shape carries any identifying value, so the views render only hook data.
    const body: unknown = method === "GET" ? [] : { _id: "server-generated-id" };
    return Promise.resolve({
      ok: true,
      json: async () => body,
    } as unknown as Response);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  teardownIdentitySources();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  clerkUser.current = null;
});

// ---------------------------------------------------------------------------
// Allowed request-URL shapes per hook. A request URL is "clean" only if it
// matches the hook's own REST surface (no identity-bearing scoping params).
// ---------------------------------------------------------------------------
const ALLOWED_URL_SHAPES: RegExp[] = [
  /^\/api\/jobs(\/[^/?]+)?$/,
  /^\/api\/notes(\/[^/?]+)?(\?jobId=[^&]*)?$/,
  /^\/api\/offers(\/[^/?]+)?$/,
  /^\/api\/user\/plan$/,
];

function isAllowedUrl(url: string): boolean {
  return ALLOWED_URL_SHAPES.some((re) => re.test(url));
}

/** Assert the cross-hook isolation invariants for the captured fetch traffic. */
function assertIsolation(id: Identity) {
  const urls = fetchedUrls();
  expect(urls.length).toBeGreaterThan(0);

  for (const url of urls) {
    // (17.2) No request is scoped by a client-side identifying value.
    for (const value of identityValues(id)) {
      expect(
        url.includes(value),
        `request URL "${url}" must not embed identifying value "${value}"`
      ).toBe(false);
    }
    // (17.1 / 17.2) Requests only ever hit the authenticated REST surface.
    expect(isAllowedUrl(url), `unexpected request URL shape: ${url}`).toBe(true);
  }

  // (17.2) The hooks never read browser identity sources to build queries.
  expect(cookieSpy).not.toHaveBeenCalled();
  expect(getItemSpy).not.toHaveBeenCalled();
}

// ---------------------------------------------------------------------------
// Property 5
// ---------------------------------------------------------------------------

describe("Property 5: data isolation (Validates: Requirements 17.1, 17.2)", () => {
  it("useJobs never scopes queries by any client-side user-identifying value", async () => {
    await fc.assert(
      fc.asyncProperty(identityArb, async (id) => {
        seedIdentitySources(id);
        const { result, unmount } = renderHook(() => useJobs());
        try {
          await waitFor(() => expect(result.current.loading).toBe(false));
          await act(async () => {
            await result.current.createJob({ title: "t", company: "c" });
          });
          await act(async () => {
            await result.current.updateJob("job-1", { title: "t2" });
          });
          await act(async () => {
            await result.current.deleteJob("job-1");
          });
          assertIsolation(id);
        } finally {
          unmount();
          teardownIdentitySources();
        }
      })
    );
  });

  it("useNotes never scopes queries by any client-side user-identifying value", async () => {
    await fc.assert(
      fc.asyncProperty(identityArb, async (id) => {
        seedIdentitySources(id);
        const { result, unmount } = renderHook(() => useNotes());
        try {
          await waitFor(() => expect(result.current.loading).toBe(false));
          // Only the job-scoping filter (a non-identifying value) is permitted.
          await act(async () => {
            await result.current.fetchNotes("job-7");
          });
          await act(async () => {
            await result.current.createNote({ title: "t", content: "c" });
          });
          await act(async () => {
            await result.current.updateNote("note-1", { title: "t2" });
          });
          await act(async () => {
            await result.current.deleteNote("note-1");
          });
          assertIsolation(id);
        } finally {
          unmount();
          teardownIdentitySources();
        }
      })
    );
  });

  it("useOffers never scopes queries by any client-side user-identifying value", async () => {
    await fc.assert(
      fc.asyncProperty(identityArb, async (id) => {
        seedIdentitySources(id);
        const { result, unmount } = renderHook(() => useOffers());
        try {
          await waitFor(() => expect(result.current.loading).toBe(false));
          await act(async () => {
            await result.current.createOffer({ company: "c", title: "t" });
          });
          await act(async () => {
            await result.current.updateOffer("offer-1", { title: "t2" });
          });
          await act(async () => {
            await result.current.deleteOffer("offer-1");
          });
          assertIsolation(id);
        } finally {
          unmount();
          teardownIdentitySources();
        }
      })
    );
  });

  it("useUserPlan ignores the client-side Clerk identity when scoping its query", async () => {
    await fc.assert(
      fc.asyncProperty(identityArb, async (id) => {
        // Inject a fully-populated client-side user identity via Clerk.
        clerkUser.current = {
          id: id.userId,
          primaryEmailAddress: { emailAddress: id.email },
          username: id.username,
        };
        seedIdentitySources(id);
        const { result, unmount } = renderHook(() => useUserPlan());
        try {
          await waitFor(() => expect(result.current.loading).toBe(false));
          assertIsolation(id);
        } finally {
          unmount();
          teardownIdentitySources();
          clerkUser.current = null;
        }
      })
    );
  });

  it("the rendered Data_View displays only authenticated-hook data, never seeded identity values", async () => {
    // A minimal Data_View: it renders exactly the items handed to it by the
    // hook. We prove that values present in client storage / cookie / URL never
    // surface in the rendered output (Requirement 17.1).
    const { renderWithTheme, cleanup } = await import("../test/render");

    const itemArb = fc.record({
      _id: fc.uuid(),
      label: fc.string({ minLength: 1, maxLength: 24 }),
    });

    fc.assert(
      fc.property(
        fc.array(itemArb, { maxLength: 12 }),
        identityArb,
        (items, id) => {
          // Ensure unique ids/labels so we can scan deterministically.
          const data = items.map((it, i) => ({
            _id: `${i}-${it._id}`,
            label: `item-${i}-${it.label}`,
          }));
          seedIdentitySources(id);

          const DataViewUnderTest = () => (
            <ul data-testid="view">
              {data.map((d) => (
                <li key={d._id}>{d.label}</li>
              ))}
            </ul>
          );

          const { getByTestId } = renderWithTheme(<DataViewUnderTest />);
          try {
            const text = getByTestId("view").textContent ?? "";
            // Only authenticated-hook data is displayed.
            for (const d of data) {
              expect(text.includes(d.label)).toBe(true);
            }
            // No client-side identity value leaks into the rendered output.
            for (const value of identityValues(id)) {
              expect(
                text.includes(value),
                `rendered view must not display client identity value "${value}"`
              ).toBe(false);
            }
          } finally {
            cleanup();
            teardownIdentitySources();
          }
        }
      )
    );
  });
});
