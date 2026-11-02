"""Optional Sentry error monitoring, off unless SENTRY_DSN is set.

This service receives users' job descriptions and interview notes, so events
are sent without request bodies, local variables, headers or user identity:
only the exception, its stack and the route.
"""
import os


def scrub_event(event: dict, _hint: dict | None = None) -> dict:
    """Drop anything that could carry user text before an event leaves the service."""
    request = event.get("request")
    if isinstance(request, dict):
        for key in ("data", "cookies", "headers", "query_string", "env"):
            request.pop(key, None)
    event.pop("user", None)
    return event


def init_sentry() -> bool:
    """Start Sentry if SENTRY_DSN is configured. Returns whether it started."""
    dsn = os.environ.get("SENTRY_DSN", "").strip()
    if not dsn:
        return False
    import sentry_sdk

    sentry_sdk.init(
        dsn=dsn,
        environment=os.environ.get("SENTRY_ENVIRONMENT", "production"),
        traces_sample_rate=0.1,
        send_default_pii=False,
        max_request_body_size="never",
        include_local_variables=False,
        before_send=scrub_event,
    )
    return True
