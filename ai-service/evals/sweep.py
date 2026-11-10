"""Retrieval experiment: python -m evals.sweep [--chunk-sizes 400,800,1200] [--ks 3,6,10]

Re-indexes the eval fixture at each chunk size (each into its own Pinecone
namespace) and measures recall@k and hit rate for each k, using the same
two-pass retrieve() as production. Embeddings only, no chat calls, so a full
sweep costs a fraction of a cent. Prints a table, marks the production setting,
writes evals/results/sweep-<timestamp>.json, and deletes its vectors afterwards.

Use it to justify CHUNK_SIZE / k with data: change one, re-run, compare.
"""
import argparse
import json
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter

import app.chunking as chunking
from app.prep import retrieve
from app.schemas import PrepRequest
from evals.metrics import hit, recall_at_k
from evals.run import EVAL_PROFILE, EVAL_USER, K, load_settings

HERE = Path(__file__).parent


def overlap_for(chunk_size: int) -> int:
    """Keep production's overlap ratio (100 / 800) at every size."""
    return round(chunk_size * chunking.CHUNK_OVERLAP / chunking.CHUNK_SIZE)


def retrieval_scores(store, cases: list[dict], jobs: dict, k: int) -> dict:
    """Mean recall@k and hit rate over the cases that name expected sources."""
    recalls, hits = [], []
    for case in cases:
        expected = set(case["expectedSourceIds"])
        if not expected:
            continue  # "insufficient data" cases have nothing to retrieve
        job = jobs[case["jobId"]]
        req = PrepRequest(
            userId=EVAL_USER, jobId=case["jobId"], jobTitle=job["title"],
            company=job["company"], focus=case["focus"], profile=EVAL_PROFILE,
        )
        retrieved = list(dict.fromkeys(c.metadata["sourceId"] for c in retrieve(store, req, k)))
        recalls.append(recall_at_k(expected, retrieved))
        hits.append(1.0 if hit(expected, retrieved) else 0.0)
    return {
        "recall": sum(recalls) / len(recalls) if recalls else None,
        "hitRate": sum(hits) / len(hits) if hits else None,
        "cases": len(recalls),
    }


def sweep(
    store_for: Callable[[int], object],
    sources: list,
    cases: list[dict],
    jobs: dict,
    chunk_sizes: list[int],
    ks: list[int],
    wait: bool = True,
) -> list[dict]:
    """One row per (chunk size, k). `store_for(size)` returns an empty store for that size."""
    rows = []
    original = chunking.splitter
    try:
        for size in chunk_sizes:
            # chunk_source reads the module-level splitter, so swapping it re-chunks.
            chunking.splitter = RecursiveCharacterTextSplitter(chunk_size=size, chunk_overlap=overlap_for(size))
            store = store_for(size)
            try:
                store.delete_all()
                indexed = store.upsert_sources(sources)
                # Scoring a half-visible index under-reports recall, so a timed-out
                # wait marks the rows incomplete instead of passing them off as data.
                complete = store.wait_for_namespace_count(indexed) if wait else True
                if not complete:
                    print(f"Warning: chunk size {size}: not all vectors were visible; rows marked incomplete")
                for k in ks:
                    scores = retrieval_scores(store, cases, jobs, k)
                    rows.append({"chunkSize": size, "k": k, "chunks": indexed, "complete": complete, **scores})
            finally:
                # Also on a crash or Ctrl-C, so a failed run doesn't leave vectors behind.
                try:
                    store.delete_all()
                except Exception as exc:  # cleanup is best-effort; the next run of this size retries it
                    print(f"Warning: could not clean up namespace for chunk size {size}: {type(exc).__name__}")
    finally:
        chunking.splitter = original
    return rows


def print_rows(rows: list[dict]) -> None:
    print(f"{'chunk size':>11}{'k':>4}{'chunks':>8}{'recall@k':>10}{'hit rate':>10}")
    for r in rows:
        prod = "  <- production" if r["chunkSize"] == chunking.CHUNK_SIZE and r["k"] == K else ""
        recall = "-" if r["recall"] is None else f"{r['recall']:.2f}"
        hit_rate = "-" if r["hitRate"] is None else f"{r['hitRate']:.0%}"
        note = prod if r.get("complete", True) else "  (incomplete index: do not use)"
        print(f"{r['chunkSize']:>11}{r['k']:>4}{r['chunks']:>8}{recall:>10}{hit_rate:>10}{note}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sweep chunk size and k for retrieval quality")
    parser.add_argument("--chunk-sizes", default="400,800,1200")
    parser.add_argument("--ks", default="3,6,10")
    args = parser.parse_args()
    load_settings()  # fail fast, without echoing values, if keys are missing

    from app.store import get_store
    from scripts.reindex import build_sources

    fixture = json.loads((HERE / "fixtures" / "user.json").read_text(encoding="utf-8"))
    cases = json.loads((HERE / "fixtures" / "cases.json").read_text(encoding="utf-8"))
    jobs = {j["_id"]: j for j in fixture["jobs"]}
    sources = build_sources(fixture["jobs"], fixture["notes"])

    chunk_sizes = [int(s) for s in args.chunk_sizes.split(",")]
    ks = [int(s) for s in args.ks.split(",")]
    rows = sweep(
        lambda size: get_store(EVAL_USER, namespace=f"eval-sweep-{size}"),
        sources, cases, jobs, chunk_sizes, ks,
    )
    print_rows(rows)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = HERE / "results" / f"sweep-{stamp}.json"
    out.write_text(json.dumps({"timestamp": stamp, "rows": rows}, indent=2), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
