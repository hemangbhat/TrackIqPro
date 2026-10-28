from types import SimpleNamespace

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


def test_ten_sources_are_embedded_in_one_call():
    index, embeddings = FakeIndex(), FakeEmbeddings()
    store = UserStore(index, embeddings, "u1")
    store.upsert_sources([make_source(f"note {i}", f"s{i}") for i in range(10)])
    assert embeddings.document_calls == [10]
    assert len(index.vectors) == 10


def test_embedding_calls_are_capped_at_500_texts():
    embeddings = FakeEmbeddings()
    store = UserStore(FakeIndex(), embeddings, "u1")
    store.upsert_sources([make_source(f"note {i}", f"s{i}") for i in range(501)])
    assert embeddings.document_calls == [500, 1]


def test_replacing_several_sources_leaves_no_orphans():
    index = FakeIndex()
    store = store_for(index, "u1")
    store.upsert_sources([make_source("x " * 2000, "s1"), make_source("y " * 2000, "s2")])
    store.upsert_sources([make_source("short", "s1"), make_source("short", "s2")])
    assert sorted(index.vectors) == ["u1#note#s1#0", "u1#note#s2#0"]


class _LaggingIndex(FakeIndex):
    """describe_index_stats reports the given counts in turn, then the last one forever."""

    def __init__(self, counts: list[int | None]):
        super().__init__()
        self._counts = counts

    def describe_index_stats(self):
        count = self._counts.pop(0) if len(self._counts) > 1 else self._counts[0]
        namespaces = {} if count is None else {"eval": SimpleNamespace(vector_count=count)}
        return SimpleNamespace(namespaces=namespaces)


def _waiter(counts: list[int | None]):
    store = UserStore(_LaggingIndex(counts), FakeEmbeddings(), "u1", namespace="eval")
    sleeps: list[float] = []
    clock = {"now": 0.0}

    def sleep(seconds: float) -> None:
        sleeps.append(seconds)
        clock["now"] += seconds

    def wait(expected: int, timeout_s: float = 60):
        return store.wait_for_namespace_count(
            expected, timeout_s=timeout_s, poll_s=2, sleep=sleep, clock=lambda: clock["now"],
            log=lambda _msg: None,
        )

    return wait, sleeps


def test_wait_for_namespace_count_polls_until_count_is_reached():
    wait, sleeps = _waiter([None, 3, 10])  # namespace missing, then partial, then complete
    assert wait(10) is True
    assert sleeps == [2, 2]


def test_wait_for_namespace_count_returns_immediately_when_ready():
    wait, sleeps = _waiter([12])
    assert wait(10) is True
    assert sleeps == []


def test_wait_for_namespace_count_gives_up_after_timeout():
    wait, sleeps = _waiter([1])
    assert wait(10, timeout_s=6) is False
    assert sum(sleeps) == 6


def test_get_store_reuses_clients_across_requests(monkeypatch):
    import app.store as store_module

    built = []

    def fake_clients(*args):
        built.append(args)
        return FakeIndex(), FakeEmbeddings()

    cached = store_module.lru_cache(fake_clients)
    monkeypatch.setattr(store_module, "_clients", cached)
    a = store_module.get_store("u1")
    b = store_module.get_store("u2", namespace="eval")
    assert len(built) == 1
    assert a._index is b._index
