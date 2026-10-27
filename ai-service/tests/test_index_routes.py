import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import UserStore, get_store_factory
from tests.fakes import FakeEmbeddings, FakeIndex

HEADERS = {"X-AI-Service-Key": "test-secret"}


@pytest.fixture
def index():
    return FakeIndex()


@pytest.fixture
def client(index):
    app.dependency_overrides[get_store_factory] = lambda: (
        lambda user_id: UserStore(index, FakeEmbeddings(), user_id)
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


SOURCE = {
    "sourceType": "note",
    "sourceId": "n1",
    "jobId": "j1",
    "title": "Round 1",
    "createdAt": "2026-01-01T00:00:00Z",
    "text": "Asked about system design and caching.",
}


def test_index_then_delete_sources(client, index):
    res = client.post("/index", json={"userId": "u1", "sources": [SOURCE]}, headers=HEADERS)
    assert res.status_code == 200
    assert res.json()["indexed"] > 0
    assert index.vectors

    res = client.post(
        "/index/delete",
        json={"userId": "u1", "sources": [{"sourceType": "note", "sourceId": "n1"}]},
        headers=HEADERS,
    )
    assert res.json() == {"deleted": True}
    assert index.vectors == {}


def test_delete_user_removes_all_their_vectors(client, index):
    client.post("/index", json={"userId": "u1", "sources": [SOURCE]}, headers=HEADERS)
    client.post("/index", json={"userId": "u2", "sources": [SOURCE]}, headers=HEADERS)
    res = client.delete("/users/u1", headers=HEADERS)
    assert res.json() == {"deleted": True}
    assert index.vectors
    assert all(i.startswith("u2#") for i in index.vectors)


def test_index_routes_require_service_key(client):
    assert client.post("/index", json={"userId": "u1", "sources": []}).status_code == 401
    assert client.delete("/users/u1").status_code == 401
