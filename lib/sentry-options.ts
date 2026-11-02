// lib/sentry-options.ts
// Shared Sentry settings for the browser, Node and edge runtimes. Error
// monitoring is off unless a DSN is configured (see docs/PRODUCTION_SETUP.md).
//
// Privacy: TrackIQ holds private interview notes, so events never carry
// request bodies, cookies, headers or user identity, only the error, its stack
// and the route.

import type { ErrorEvent } from "@sentry/nextjs";

/** Drop anything that could contain user content before an event leaves the app. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
    if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
    }
    delete event.user;
    return event;
}

export function sentryOptions(dsn: string | undefined) {
    return {
        dsn,
        enabled: Boolean(dsn),
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
        // Errors are always sent; only 10% of requests are traced for performance.
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
        beforeSend: scrubEvent,
    };
}
