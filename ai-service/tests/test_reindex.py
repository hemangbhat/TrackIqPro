from datetime import datetime, timezone

from bson import ObjectId

from scripts.reindex import build_sources, reindex_users

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


def test_empty_note_is_skipped():
    assert build_sources([], [{"_id": "n", "jobId": None, "title": " ", "content": " ",
                               "createdAt": "x"}]) == []


def test_title_only_note_is_kept():
    [s] = build_sources([], [{"_id": "n", "jobId": None, "title": "Idea", "content": "",
                              "createdAt": "x"}])
    assert s.text == "Idea" + chr(10) * 2


class _FakeStore:
    def __init__(self, user_id):
        if "#" in user_id:
            raise ValueError("user_id must not contain '#'")
        self.user_id = user_id
        self.upserted = []
        self.deleted_all = False

    def delete_all(self):
        self.deleted_all = True

    def upsert_sources(self, sources):
        self.upserted = sources
        return len(sources)


def test_one_failing_user_does_not_stop_the_run(capsys):
    stores = {}

    def factory(user_id):
        stores[user_id] = _FakeStore(user_id)
        return stores[user_id]

    def load_docs(user_id):
        return [{**JOB, "jobDescription": "JD"}], []

    failures = reindex_users(["bad#id", "u2"], load_docs, factory)
    assert failures == 1
    assert len(stores["u2"].upserted) == 1
    assert stores["u2"].deleted_all
    out = capsys.readouterr().out
    assert "user=bad#id FAILED ValueError" in out
    assert "user=u2 sources=1 chunks=1" in out


def test_reindex_removes_vectors_of_deleted_sources():
    from app.store import UserStore
    from tests.fakes import FakeEmbeddings, FakeIndex

    index = FakeIndex()
    factory = lambda user_id: UserStore(index, FakeEmbeddings(), user_id)  # noqa: E731
    kept = {"_id": "n1", "jobId": None, "title": "Kept", "content": "c", "createdAt": "x"}
    deleted = {"_id": "n2", "jobId": None, "title": "Deleted", "content": "c", "createdAt": "x"}
    other_user = {"_id": "n9", "jobId": None, "title": "Theirs", "content": "c", "createdAt": "x"}

    reindex_users(["u1"], lambda _u: ([], [kept, deleted]), factory)
    reindex_users(["u2"], lambda _u: ([], [other_user]), factory)
    # n2 was deleted in Mongo but its delete sync never reached the service.
    assert reindex_users(["u1"], lambda _u: ([], [kept]), factory) == 0

    assert sorted(index.vectors) == ["u1#note#n1#0", "u2#note#n9#0"]


def test_reindex_clears_a_user_whose_sources_are_all_gone():
    from app.store import UserStore
    from tests.fakes import FakeEmbeddings, FakeIndex

    index = FakeIndex()
    factory = lambda user_id: UserStore(index, FakeEmbeddings(), user_id)  # noqa: E731
    note = {"_id": "n1", "jobId": None, "title": "Old", "content": "c", "createdAt": "x"}
    reindex_users(["u1"], lambda _u: ([], [note]), factory)
    reindex_users(["u1"], lambda _u: ([], []), factory)
    assert index.vectors == {}
