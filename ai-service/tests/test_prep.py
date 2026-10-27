import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.prep import get_chat, retrieve, run_prep
from app.schemas import IndexSource, LLMPrep, LLMQuestion, PrepRequest, Profile
from app.store import UserStore, get_store_factory
from tests.fakes import FakeChat, FakeEmbeddings, FakeIndex

HEADERS = {"X-AI-Service-Key": "test-secret"}


def make_req():
    return PrepRequest(
        userId="u1",
        jobId="j1",
        jobTitle="Backend Engineer",
        company="Acme",
        focus="system design",
        profile=Profile(skills=["python"], targetRole="Backend", seniority="senior"),
    )


def source(source_type, source_id, job_id, text="Asked about caching."):
    return IndexSource(
        sourceType=source_type,
        sourceId=source_id,
        jobId=job_id,
        title=f"{source_type} {source_id}",
        createdAt="2026-01-01T00:00:00Z",
        text=text,
    )


@pytest.fixture
def index():
    return FakeIndex()


@pytest.fixture
def store(index):
    return UserStore(index, FakeEmbeddings(), "u1")


def test_retrieve_runs_two_passes_with_expected_filters(store, index):
    store.upsert_sources(
        [
            source("job_description", "d1", "j1"),
            source("note", "n1", "j1"),  # found by pass 1 only
            source("note", "n2", "j2"),  # found by pass 2 only
            source("job_description", "d2", "j2"),  # neither pass
        ]
    )
    chunks = retrieve(store, make_req())

    pass1, pass2 = (f["$and"][1] for f in index.query_filters)
    assert pass1 == {"jobId": {"$eq": "j1"}}
    assert pass2 == {"$and": [{"jobId": {"$ne": "j1"}}, {"sourceType": {"$eq": "note"}}]}
    assert {c.metadata["sourceId"] for c in chunks} == {"d1", "n1", "n2"}
    assert chunks[-1].metadata["sourceId"] == "n2"  # pass-1 results come first


def test_prep_with_no_matches_skips_llm(store):
    chat = FakeChat(LLMPrep(insufficientData=False))
    result = run_prep(store, chat, make_req())
    assert result.insufficientData is True
    assert chat.calls == 0


def test_run_prep_labels_chunks_and_puts_profile_in_prompt(store):
    store.upsert_sources([source("note", "n1", "j1")])
    chat = FakeChat(
        LLMPrep(
            insufficientData=False,
            likelyQuestions=[LLMQuestion(question="q", why="w", citations=["S1"])],
        )
    )
    result = run_prep(store, chat, make_req())
    prompt = " ".join(str(m) for m in chat.messages)
    assert "[S1]" in prompt and "python" in prompt and "system design" in prompt
    assert result.likelyQuestions[0].citations[0].sourceId == "n1"


def test_prep_route_returns_guarded_result(index):
    UserStore(index, FakeEmbeddings(), "u1").upsert_sources([source("note", "n1", "j1")])
    canned = LLMPrep(
        insufficientData=False,
        likelyQuestions=[
            LLMQuestion(question="good", why="w", citations=["S1"]),
            LLMQuestion(question="invented", why="w", citations=["S42"]),
            LLMQuestion(question="uncited", why="w", citations=[]),
        ],
    )
    app.dependency_overrides[get_store_factory] = lambda: (
        lambda user_id: UserStore(index, FakeEmbeddings(), user_id)
    )
    app.dependency_overrides[get_chat] = lambda: FakeChat(canned)
    try:
        res = TestClient(app).post("/prep", json=make_req().model_dump(), headers=HEADERS)
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    body = res.json()
    assert [q["question"] for q in body["likelyQuestions"]] == ["good"]
    for item in body["likelyQuestions"] + body["weakSpots"] + body["studyPlan"]:
        assert len(item["citations"]) >= 1


def test_prep_route_rejects_bad_user_id():
    app.dependency_overrides[get_store_factory] = lambda: (
        lambda user_id: UserStore(FakeIndex(), FakeEmbeddings(), user_id)
    )
    app.dependency_overrides[get_chat] = lambda: FakeChat(LLMPrep(insufficientData=True))
    try:
        body = make_req().model_dump() | {"userId": "a#b"}
        res = TestClient(app).post("/prep", json=body, headers=HEADERS)
    finally:
        app.dependency_overrides.clear()
    assert res.status_code == 422
