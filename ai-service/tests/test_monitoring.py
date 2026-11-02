from app.monitoring import init_sentry, scrub_event


def test_sentry_stays_off_without_a_dsn(monkeypatch):
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    assert init_sentry() is False


def test_events_never_carry_note_text_or_identity():
    event = {
        "exception": {"values": [{"type": "ValueError"}]},
        "request": {
            "url": "https://ai.test/index",
            "method": "POST",
            "data": {"sources": [{"text": "My interview notes"}]},
            "headers": {"X-AI-Service-Key": "secret"},
            "cookies": {"a": "b"},
            "query_string": "userId=u1",
        },
        "user": {"id": "u1"},
    }
    scrubbed = scrub_event(event)
    assert scrubbed["request"] == {"url": "https://ai.test/index", "method": "POST"}
    assert "user" not in scrubbed
    assert scrubbed["exception"] == {"values": [{"type": "ValueError"}]}
