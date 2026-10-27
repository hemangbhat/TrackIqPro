import pytest

from app.chunking import vector_id_prefix
from app.schemas import IndexSource, SourceRef
from app.store import UserStore
from tests.fakes import FakeEmbeddings, FakeIndex


def make_source(text: str, source_id: str = "s1", job_id: str = "j1") -> IndexSource:
    return IndexSource(
        sourceType="note",
        sourceId=source_id,
        jobId=job_id,
        title="t",
        createdAt="2026-01-01T00:00:00Z",
        text=text,
    )


def store_for(index: FakeIndex, user_id: str) -> UserStore:
    return UserStore(index, FakeEmbeddings(), user_id)


def test_query_always_includes_user_filter():
    index = FakeIndex()
    store_for(index, "u1").query("x", 5, {"jobId": {"$eq": "j1"}})
    assert index.query_filters == [
        {"$and": [{"userId": {"$eq": "u1"}}, {"jobId": {"$eq": "j1"}}]}
    ]


def test_user_cannot_read_other_users_vectors():
    index = FakeIndex()
    store_for(index, "u1").upsert_sources([make_source("secret note")])
    assert store_for(index, "u1").query("x", 5, {"jobId": {"$eq": "j1"}}) != []
    assert store_for(index, "u2").query("x", 5, {"jobId": {"$eq": "j1"}}) == []


def test_empty_user_id_rejected():
    with pytest.raises(ValueError):
        UserStore(FakeIndex(), FakeEmbeddings(), user_id="")


def test_user_id_with_hash_rejected():
    # "a#b" would make prefix "a#b#..." overlap with user "a"'s prefix space.
    with pytest.raises(ValueError):
        UserStore(FakeIndex(), FakeEmbeddings(), user_id="a#b")


def test_upsert_long_source_batches_and_replaces():
    index = FakeIndex()
    store = store_for(index, "u1")
    count = store.upsert_sources([make_source("word " * 24000)])  # 120,000 chars: >100 chunks forces several batches
    assert count > 100
    assert max(index.upsert_batches) <= 100
    assert len(index.upsert_batches) > 1

    store.upsert_sources([make_source("a" * 900)])
    prefix = vector_id_prefix("u1", "note", "s1")
    assert len([i for i in index.vectors if i.startswith(prefix)]) == 2


def test_delete_all_removes_only_that_user():
    index = FakeIndex()
    store_for(index, "u1").upsert_sources([make_source("one")])
    store_for(index, "u2").upsert_sources([make_source("two")])
    store_for(index, "u1").delete_all()
    assert index.vectors
    assert all(i.startswith("u2#") for i in index.vectors)


def test_delete_sources_removes_only_that_source():
    index = FakeIndex()
    store = store_for(index, "u1")
    store.upsert_sources([make_source("one", "s1"), make_source("two", "s2")])
    store.delete_sources([SourceRef(sourceType="note", sourceId="s1")])
    assert list(index.vectors) == ["u1#note#s2#0"]


def test_delete_batches_large_id_lists():
    index = FakeIndex()
    store = store_for(index, "u1")
    store.upsert_sources([make_source("word " * 24000)])
    store.delete_all()
    assert index.vectors == {}
    assert max(index.delete_batches) <= 100
