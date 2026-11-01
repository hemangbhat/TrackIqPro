from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_needs_no_key():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_protected_route_rejects_missing_key():
    assert client.post("/prep").status_code == 401


def test_protected_route_rejects_wrong_key():
    response = client.post("/prep", headers={"X-AI-Service-Key": "nope"})
    assert response.status_code == 401


def test_settings_reject_an_empty_service_secret(monkeypatch):
    # An empty secret would match a request that sends no key at all.
    import pytest
    from pydantic import ValidationError

    from app.config import Settings

    monkeypatch.setenv("AI_SERVICE_SECRET", "")
    with pytest.raises(ValidationError):
        Settings()


def test_api_docs_are_not_published():
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert client.get(path).status_code == 404
