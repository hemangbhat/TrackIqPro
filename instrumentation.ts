import * as Sentry from "@sentry/nextjs";

// Server-side error monitoring (App Router pages and Pages Router API routes).
// Does nothing unless SENTRY_DSN is set.
export async function register() {
    if (!process.env.SENTRY_DSN) return;
    const { sentryOptions } = await import("./lib/sentry-options");
    Sentry.init(sentryOptions(process.env.SENTRY_DSN));
}

// Reports errors thrown while rendering or handling a request; a no-op when
// Sentry was never initialised.
export const onRequestError = Sentry.captureRequestError;
