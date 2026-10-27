"""Eval harness: python -m evals.run [--no-index]

Indexes a fixed fixture user into the Pinecone namespace "eval", runs every case
through the real retrieve + run_prep pipeline, and reports four numbers:
  recall@k / hit   did retrieval find the sources a human says matter?
  citation valid   does every citation point at a retrieved source?
  grounded         does an LLM judge say each output item is supported by its cited text?
  insufficient ok  does the service say "not enough data" exactly when it should?
"""
import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from app.chunking import CHUNK_OVERLAP, CHUNK_SIZE
from app.schemas import PrepRequest, PrepResult, Profile
from evals.metrics import citation_validity, hit, judge_groundedness, recall_at_k

HERE = Path(__file__).parent
EVAL_USER = "eval-user"
EVAL_NAMESPACE = "eval"  # keeps eval vectors away from real users' data
K = 6  # same value retrieve() uses in production
REQUIRED_ENV = ("OPENAI_API_KEY", "PINECONE_API_KEY", "PINECONE_INDEX")
EVAL_PROFILE = Profile(skills=["Python", "SQL", "distributed systems"], targetRole="Backend Engineer", seniority="senior")


def check_env() -> None:
    missing = [name for name in REQUIRED_ENV if not os.environ.get(name)]
    if missing:
        raise SystemExit(
            f"Missing environment variables: {', '.join(missing)}. "
            "Export them in your shell (plus AI_SERVICE_SECRET and OPENAI_CHAT_MODEL) and re-run."
        )


def prep_items(result: PrepResult) -> list[tuple[str, list]]:
    """Every output item as (text to judge, its citations)."""
    items = [(f"{q.question} {q.why}", q.citations) for q in result.likelyQuestions]
    items += [(f"{w.topic}: {w.detail}", w.citations) for w in result.weakSpots]
    items += [(s.item, s.citations) for s in result.studyPlan]
    return items


def groundedness(chat, result: PrepResult, chunks) -> float | None:
    """Share of items the judge deems supported. None when there are no items."""
    items = prep_items(result)
    if not items:
        return None
    supported = 0
    for text, citations in items:
        cited_ids = {c.sourceId for c in citations}
        cited_texts = [c.metadata["text"] for c in chunks if c.metadata["sourceId"] in cited_ids]
        supported += judge_groundedness(chat, text, cited_texts)
    return supported / len(items)


def mean(values: list[float]) -> float | None:
    values = [v for v in values if v is not None]
    return sum(values) / len(values) if values else None


def fmt(value, pct: bool = False) -> str:
    if value is None:
        return "-"
    return f"{value:.0%}" if pct else f"{value:.2f}"


def run_case(store, chat, case: dict, jobs: dict) -> dict:
    from app.prep import retrieve, run_prep

    job = jobs[case["jobId"]]
    req = PrepRequest(
        userId=EVAL_USER, jobId=case["jobId"], jobTitle=job["title"],
        company=job["company"], focus=case["focus"], profile=EVAL_PROFILE,
    )
    chunks = retrieve(store, req, K)
    retrieved_ids = list(dict.fromkeys(c.metadata["sourceId"] for c in chunks))  # dedupe, keep order
    result = run_prep(store, chat, req)
    expected = set(case["expectedSourceIds"])
    return {
        "id": case["id"],
        # recall/hit only mean something when the case expects sources
        "recall": recall_at_k(expected, retrieved_ids) if expected else None,
        "hit": hit(expected, retrieved_ids) if expected else None,
        "citationValidity": citation_validity(result, set(retrieved_ids)),
        "groundedness": groundedness(chat, result, chunks),
        "insufficientCorrect": result.insufficientData == case["expectInsufficient"],
        "retrievedSourceIds": retrieved_ids,
    }


def print_table(rows: list[dict], averages: dict) -> None:
    print(f"{'case':<26}{'recall@k':>9}{'hit':>6}{'cite ok':>9}{'grounded':>10}{'insuff ok':>11}")
    for r in rows:
        hit_text = "-" if r["hit"] is None else ("yes" if r["hit"] else "no")
        print(
            f"{r['id']:<26}{fmt(r['recall']):>9}{hit_text:>6}{fmt(r['citationValidity']):>9}"
            f"{fmt(r['groundedness'], True):>10}{'yes' if r['insufficientCorrect'] else 'NO':>11}"
        )
    print(
        f"{'AVERAGE':<26}{fmt(averages['recall']):>9}{fmt(averages['hitRate'], True):>6}"
        f"{fmt(averages['citationValidity']):>9}{fmt(averages['groundedness'], True):>10}"
        f"{fmt(averages['insufficientCorrect'], True):>11}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the retrieval + groundedness eval")
    parser.add_argument("--no-index", action="store_true", help="reuse vectors already in the eval namespace")
    args = parser.parse_args()
    check_env()

    # Imported after the env check so a missing key gives the clear message above.
    from app.config import get_settings
    from app.prep import get_chat
    from app.store import get_store
    from scripts.reindex import build_sources

    fixture = json.loads((HERE / "fixtures" / "user.json").read_text(encoding="utf-8"))
    cases = json.loads((HERE / "fixtures" / "cases.json").read_text(encoding="utf-8"))
    jobs = {j["_id"]: j for j in fixture["jobs"]}

    store = get_store(EVAL_USER, namespace=EVAL_NAMESPACE)
    if not args.no_index:
        sources = build_sources(fixture["jobs"], fixture["notes"])
        print(f"Indexed {store.upsert_sources(sources)} chunks from {len(sources)} sources")
    chat = get_chat()

    rows = [run_case(store, chat, case, jobs) for case in cases]
    averages = {
        "recall": mean([r["recall"] for r in rows]),
        "hitRate": mean([float(r["hit"]) for r in rows if r["hit"] is not None]),
        "citationValidity": mean([r["citationValidity"] for r in rows]),
        "groundedness": mean([r["groundedness"] for r in rows]),
        "insufficientCorrect": mean([float(r["insufficientCorrect"]) for r in rows]),
    }
    print_table(rows, averages)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = HERE / "results" / f"{stamp}.json"
    out.write_text(
        json.dumps(
            {
                "timestamp": stamp,
                "k": K,
                "chunk_size": CHUNK_SIZE,
                "chunk_overlap": CHUNK_OVERLAP,
                "chat_model": get_settings().openai_chat_model,
                "averages": averages,
                "cases": rows,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
