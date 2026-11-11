import { describe, expect, it } from "vitest";
import { greetingFor } from "./greeting";

describe("greetingFor", () => {
    it.each([
        [4, "Welcome back"],
        [5, "Good morning"],
        [11, "Good morning"],
        [12, "Good afternoon"],
        [16, "Good afternoon"],
        [17, "Good evening"],
        [21, "Good evening"],
        [22, "Welcome back"],
        [0, "Welcome back"],
    ])("hour %i -> %s", (hour, expected) => {
        expect(greetingFor(hour)).toBe(expected);
    });
});
