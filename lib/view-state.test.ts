// lib/view-state.test.ts
import { describe, it, expect } from "vitest";
import { resolveViewState } from "./view-state";

describe("resolveViewState", () => {
    it("yields 'loading' while the hook is loading (initial)", () => {
        expect(resolveViewState({ loading: true, error: null, data: [] })).toBe(
            "loading"
        );
    });

    it("yields 'loading' on retry even when stale data/error are present", () => {
        // retry sets loading=true; loading must take precedence (Req 3.4)
        expect(
            resolveViewState({ loading: true, error: "boom", data: [{ id: 1 }] })
        ).toBe("loading");
    });

    it("yields 'error' when not loading and an error is set", () => {
        expect(
            resolveViewState({ loading: false, error: "Failed to load", data: [] })
        ).toBe("error");
    });

    it("yields 'error' even when prior data exists (data preserved separately)", () => {
        expect(
            resolveViewState({ loading: false, error: "Failed", data: [{ id: 1 }] })
        ).toBe("error");
    });

    it("yields 'empty' when resolved with zero items", () => {
        expect(resolveViewState({ loading: false, error: null, data: [] })).toBe(
            "empty"
        );
    });

    it("treats null/undefined data as empty", () => {
        expect(resolveViewState({ loading: false, error: null, data: null })).toBe(
            "empty"
        );
        expect(
            resolveViewState({ loading: false, error: undefined, data: undefined })
        ).toBe("empty");
    });

    it("treats empty-string error as no error", () => {
        expect(
            resolveViewState({ loading: false, error: "", data: [{ id: 1 }] })
        ).toBe("ready");
    });

    it("yields 'ready' when resolved with one or more items", () => {
        expect(
            resolveViewState({ loading: false, error: null, data: [{ id: 1 }] })
        ).toBe("ready");
    });
});
