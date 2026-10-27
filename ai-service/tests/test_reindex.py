from datetime import datetime, timezone

from bson import ObjectId

from scripts.reindex import build_sources

JOB = {"_id": "job1", "userId": "u1", "title": "Backend Engineer", "company": "Acme",
       "createdAt": "2026-01-01T00:00:00+00:00"}


def test_job_without_description_or_notes_yields_nothing():
    assert build_sources([JOB], []) == []


def test_job_with_description_and_notes_yields_two_sources():
    job = {**JOB, "jobDescription": "Build APIs", "notes": "Referred by Sam"}
    sources = build_sources([job], [])
    assert [s.sourceType for s in sources] == ["job_description", "job_notes"]
    assert all(s.sourceId == "job1" and s.jobId == "job1" for s in sources)
    assert sources[0].text == "Backend Engineer at Acme\n\nBuild APIs"
    assert sources[1].text == "Backend Engineer at Acme\n\nReferred by Sam"
    assert all(s.round == "" and s.company == "Acme" for s in sources)


def test_whitespace_only_fields_are_skipped():
    assert build_sources([{**JOB, "jobDescription": "  \n", "notes": " "}], []) == []


def test_note_without_job_gets_none_job_id():
    note = {"_id": "n1", "userId": "u1", "jobId": None, "title": "Caching", "content": "Redis TTLs",
            "round": "Technical", "createdAt": "2026-02-01T00:00:00+00:00"}
    [s] = build_sources([], [note])
    assert s.jobId == "none" and s.sourceType == "note" and s.sourceId == "n1"
    assert s.text == "Caching\n\nRedis TTLs" and s.round == "Technical" and s.title == "Caching"
    assert s.company == ""


def test_note_under_job_carries_job_company():
    note = {"_id": "n2", "jobId": "job1", "title": "Sys design", "content": "Sharding",
            "createdAt": "2026-02-01T00:00:00+00:00"}
    [s] = build_sources([JOB], [note])
    assert s.jobId == "job1" and s.company == "Acme" and s.title == "Sys design" and s.round == ""


def test_pymongo_shaped_docs_are_converted():
    oid, joid = ObjectId(), ObjectId()
    when = datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc)
    job = {**JOB, "_id": joid, "jobDescription": "JD", "createdAt": when}
    note = {"_id": oid, "jobId": str(joid), "title": "t", "content": "c", "createdAt": when}
    jd, n = build_sources([job], [note])
    assert jd.sourceId == str(joid) and jd.createdAt == when.isoformat()
    assert n.sourceId == str(oid) and n.jobId == str(joid) and n.company == "Acme"
    assert n.createdAt == when.isoformat()


def test_empty_note_is_skipped_but_title_only_kept():
    assert build_sources([], [{"_id": "n", "jobId": None, "title": " ", "content": " ",
                               "createdAt": "x"}]) == []
