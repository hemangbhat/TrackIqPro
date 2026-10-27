from app.chunking import chunk_source
from app.schemas import IndexSource


def make_source(text: str, job_id: str = "j1") -> IndexSource:
    return IndexSource(
        sourceType="note",
        sourceId="n1",
        jobId=job_id,
        company="Acme",
        title="Round 1",
        round="phone",
        createdAt="2026-10-27T00:00:00Z",
        text=text,
    )


def test_short_text_is_one_chunk():
    chunks = chunk_source("u1", make_source("a" * 300))
    assert len(chunks) == 1
    assert chunks[0].id == "u1#note#n1#0"
    assert chunks[0].metadata["userId"] == "u1"


def test_long_text_splits_with_800_limit():
    text = " ".join(["word"] * 1500)[:5000]
    chunks = chunk_source("u1", make_source(text))
    assert len(chunks) > 1
    assert all(len(c.text) <= 800 for c in chunks)
    for i, c in enumerate(chunks):
        assert c.id == f"u1#note#n1#{i}"


def test_metadata_carries_job_none():
    chunks = chunk_source("u1", make_source("hello", job_id="none"))
    assert chunks[0].metadata["jobId"] == "none"


def test_empty_text_yields_no_chunks():
    assert chunk_source("u1", make_source("   ")) == []
