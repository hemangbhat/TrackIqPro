"""Backfill / repair: re-index every opted-in user's jobs and notes from MongoDB.

Usage (from ai-service/):  python -m scripts.reindex [--user USER_ID]

Safe to run any time: upserting a source replaces all of its chunks.
Only users with careerprofiles.aiEnabled == true are touched.
Prints counts only, never note content.
"""
import argparse
from datetime import datetime

from app.config import get_settings
from app.schemas import IndexSource
from app.store import get_store


def _iso(value) -> str:
    return value.isoformat() if isinstance(value, datetime) else str(value or "")


def _has_text(value) -> bool:
    return isinstance(value, str) and bool(value.strip())


def build_sources(job_docs: list[dict], note_docs: list[dict]) -> list[IndexSource]:
    """Turn Mongo job/note documents into IndexSources (same mapping as lib/ai-sources.ts).

    Accepts pymongo documents (ObjectId _id, datetime createdAt) and plain
    JSON-shaped dicts (string _id, ISO createdAt).
    """
    sources: list[IndexSource] = []
    jobs_by_id = {str(j["_id"]): j for j in job_docs}

    for job in job_docs:
        job_id = str(job["_id"])
        prefix = f"{job['title']} at {job['company']}\n\n"
        for source_type, field in (("job_description", "jobDescription"), ("job_notes", "notes")):
            body = job.get(field)
            if not _has_text(body):
                continue
            sources.append(
                IndexSource(
                    sourceType=source_type,
                    sourceId=job_id,
                    jobId=job_id,
                    company=job["company"],
                    title=job["title"],
                    round="",
                    createdAt=_iso(job.get("createdAt")),
                    text=prefix + body,
                )
            )

    for note in note_docs:
        title, content = note.get("title") or "", note.get("content") or ""
        if not (_has_text(title) or _has_text(content)):
            continue
        raw_job_id = note.get("jobId")
        job_id = str(raw_job_id) if raw_job_id else "none"
        parent = jobs_by_id.get(job_id)
        sources.append(
            IndexSource(
                sourceType="note",
                sourceId=str(note["_id"]),
                jobId=job_id,
                company=parent["company"] if parent else "",
                title=title,
                round=note.get("round") or "",
                createdAt=_iso(note.get("createdAt")),
                text=f"{title}\n\n{content}",
            )
        )
    return sources


def main() -> None:
    from pymongo import MongoClient

    parser = argparse.ArgumentParser(description="Re-index opted-in users from MongoDB")
    parser.add_argument("--user", help="only re-index this user id")
    args = parser.parse_args()

    uri = get_settings().mongodb_uri
    if not uri:
        raise SystemExit("MONGODB_URI is not set")
    db = MongoClient(uri).get_default_database()

    query = {"aiEnabled": True}
    if args.user:
        query["userId"] = args.user
    user_ids = sorted({p["userId"] for p in db["careerprofiles"].find(query)})
    if not user_ids:
        print("No opted-in users found.")
        return

    for user_id in user_ids:
        jobs = list(db["jobs"].find({"userId": user_id}))
        notes = list(db["notes"].find({"userId": user_id}))
        sources = build_sources(jobs, notes)
        chunks = get_store(user_id).upsert_sources(sources) if sources else 0
        print(f"user={user_id} sources={len(sources)} chunks={chunks}")


if __name__ == "__main__":
    main()
