// vitest-axe@0.1 augments the legacy `Vi` namespace, which Vitest 4 no longer
// reads. Register its matcher on Vitest's current Assertion interface so
// `expect(results).toHaveNoViolations()` type-checks.
import "vitest";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
    interface Assertion<T = any> extends AxeMatchers {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface AsymmetricMatchersContaining extends AxeMatchers {}
}
