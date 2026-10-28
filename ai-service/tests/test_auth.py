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
