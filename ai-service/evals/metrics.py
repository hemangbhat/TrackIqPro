"""Pure eval metrics. No Pinecone, no network (the judge takes a chat object)."""
from pydantic import BaseModel

from app.schemas import PrepResult


def recall_at_k(expected: set[str], retrieved: list[str]) -> float:
    """Share of the expected source ids that appear in the retrieved ones."""
    if not expected:
        return 1.0  # nothing was required, so nothing was missed
    return len(expected & set(retrieved)) / len(expected)


def hit(expected: set[str], retrieved: list[str]) -> bool:
    """Did retrieval find at least one expected source?"""
    return bool(expected & set(retrieved))


def citation_validity(result: PrepResult, retrieved_source_ids: set[str]) -> float:
    """Share of output citations that point at a source retrieval really returned.
    The citation guard should make this 1.0; the eval proves it end to end."""
    citations = [
        c
        for items in (result.likelyQuestions, result.weakSpots, result.studyPlan)
        for item in items
        for c in item.citations
    ]
    if not citations:
        return 1.0  # vacuously valid (e.g. an insufficientData result)
    return sum(c.sourceId in retrieved_source_ids for c in citations) / len(citations)


class JudgeVerdict(BaseModel):
    supported: bool
    reason: str


# LLM-as-judge prompt: deliberately strict and narrow (one claim, only the cited text).
JUDGE_PROMPT = """You check whether a claim is supported by source excerpts.
Answer supported=true only if the excerpts directly state or clearly imply the claim.
Generic advice, outside knowledge, or details absent from the excerpts mean supported=false.
Give a one-sentence reason."""


def judge_groundedness(chat, item_text: str, cited_texts: list[str]) -> bool:
    if not cited_texts:
        return False
    sources = "\n\n".join(f"SOURCE {i}:\n{t}" for i, t in enumerate(cited_texts, start=1))
    verdict = chat.with_structured_output(JudgeVerdict).invoke(
        [("system", JUDGE_PROMPT), ("human", f"{sources}\n\nCLAIM:\n{item_text}")]
    )
    return verdict.supported
