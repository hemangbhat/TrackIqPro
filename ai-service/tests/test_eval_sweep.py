import pytest

import app.chunking as chunking
from app.schemas import IndexSource
from app.store import UserStore
from evals.sweep import overlap_for, sweep
from tests.fakes import FakeEmbeddings, FakeIndex

JOB = {"_id": "j1", "title": "Backend Engineer", "company": "Acme"}
CASES = [
    {"id": "c1", "jobId": "j1", "focus": "", "expectedSourceIds": ["j1"], "expectInsufficient": False},
    {"id": "c2", "jobId": "j1", "focus": "", "expectedSourceIds": [], "expectInsufficient": True},
]
SOURCES = [
    IndexSource(
        sourceType="job_description", sourceId="j1", jobId="j1",
        title="Backend Engineer", company="Acme", createdAt="2026-01-01T00:00:00Z",
        text="Python services. " * 120,
    )
]


def test_sweep_reports_each_setting_and_restores_production_chunking():
    stores = {}

    def store_for(size):
        stores[size] = UserStore(FakeIndex(), FakeEmbeddings(), "eval-user", namespace=f"eval-sweep-{size}")
        return stores[size]

    original = chunking.splitter
    rows = sweep(store_for, SOURCES, CASES, {"j1": JOB}, [400, 1200], [3, 6], wait=False)

    assert [(r["chunkSize"], r["k"]) for r in rows] == [(400, 3), (400, 6), (1200, 3), (1200, 6)]
    # Smaller chunks split the same text into more pieces.
    assert rows[0]["chunks"] > rows[2]["chunks"]
    # Only the case that expects sources is scored, and the job's own text is found.
    assert all(r["cases"] == 1 and r["recall"] == 1.0 and r["hitRate"] == 1.0 for r in rows)
    # Production chunking is untouched, and the sweep cleans up its vectors.
    assert chunking.splitter is original
    assert all(not s._index.vectors for s in stores.values())


def test_rows_are_marked_incomplete_when_vectors_never_become_visible():
    store = UserStore(FakeIndex(), FakeEmbeddings(), "eval-user", namespace="eval-sweep-800")
    store.wait_for_namespace_count = lambda expected: False  # Pinecone never caught up

    rows = sweep(lambda size: store, SOURCES, CASES, {"j1": JOB}, [800], [6])

    assert [r["complete"] for r in rows] == [False]


def test_vectors_are_cleaned_up_when_a_run_crashes():
    store = UserStore(FakeIndex(), FakeEmbeddings(), "eval-user", namespace="eval-sweep-800")

    def boom(expected):
        raise RuntimeError("pinecone down")

    store.wait_for_namespace_count = boom
    original = chunking.splitter

    with pytest.raises(RuntimeError):
        sweep(lambda size: store, SOURCES, CASES, {"j1": JOB}, [800], [6])

    assert not store._index.vectors
    assert chunking.splitter is original


def test_overlap_keeps_the_production_ratio():
    assert overlap_for(chunking.CHUNK_SIZE) == chunking.CHUNK_OVERLAP
    assert overlap_for(400) == 50
