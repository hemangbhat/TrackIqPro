import { describe, it, expect } from "vitest";
import { toCSV } from "./csv";

describe("toCSV", () => {
    it("writes a header row from the first row's keys", () => {
        expect(toCSV([{ Company: "Vercel", Base: 180000 }])).toBe("Company,Base\r\nVercel,180000");
    });

    it("quotes cells containing commas, quotes, or newlines", () => {
        expect(toCSV([{ A: 'Say "hi", ok', B: "line\nbreak" }])).toBe(
            'A,B\r\n"Say ""hi"", ok","line\nbreak"'
        );
    });

    it("neutralizes formula-like strings but leaves numbers alone", () => {
        expect(toCSV([{ A: "=HYPERLINK(\"x\")", B: "+1", C: -5 }])).toBe(
            "A,B,C\r\n\"'=HYPERLINK(\"\"x\"\")\",'+1,-5"
        );
    });

    it("renders null/undefined as empty and returns empty for no rows", () => {
        expect(toCSV([{ A: null, B: undefined }])).toBe("A,B\r\n,");
        expect(toCSV([])).toBe("");
    });
});
