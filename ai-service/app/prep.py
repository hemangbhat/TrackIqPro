"""Interview prep pipeline: retrieve the user's own chunks, ask the LLM, then enforce citations in code."""
from app.config import get_settings
from app.schemas import (
    Citation,
    LikelyQuestion,
    LLMPrep,
    PrepRequest,
    PrepResult,
    StudyItem,
    WeakSpot,
)
from app.store import RetrievedChunk, UserStore

EMPTY_DATA_MESSAGE = "Add notes from your rounds to get prep tailored to you"

# Shown in interviews: the prompt asks for citations, but the guard below is what guarantees them.
PREP_SYSTEM_PROMPT = """You are an interview preparation coach.
Use ONLY the numbered sources provided in the user message. Never use outside knowledge
about the company or role, and never invent details.
Cite every item (each question, weak spot and study plan entry) with the [S#] labels of the
sources that support it, listing labels exactly as given, e.g. ["S1", "S3"].
An item you cannot support with a source must be left out.
If the sources do not contain enough to prepare the candidate, set insufficientData to true
and return empty lists."""


def retrieve(store: UserStore, req: PrepRequest, k: int = 6) -> list[RetrievedChunk]:
    """Two passes: everything about this job, then the user's notes from OTHER jobs
    (past interview experience carries over). Pass-1 chunks come first."""
    text = f"{req.jobTitle} at {req.company}. {req.focus}"
    this_job = store.query(text, k, {"jobId": {"$eq": req.jobId}})
    other_notes = store.query(
        text, k, {"$and": [{"jobId": {"$ne": req.jobId}}, {"sourceType": {"$eq": "note"}}]}
    )
    seen: set[str] = set()
    chunks = []
    for chunk in this_job + other_notes:
        if chunk.id not in seen:  # dedupe by id, keeping the first occurrence
            seen.add(chunk.id)
            chunks.append(chunk)
    return chunks


def _insufficient() -> PrepResult:
    return PrepResult(insufficientData=True, message=EMPTY_DATA_MESSAGE)


def apply_citation_guard(llm: LLMPrep, labelled: dict[str, RetrievedChunk]) -> PrepResult:
    """Code-level guarantee: no output item survives without a real, retrieved source.
    Invented labels are dropped; items left with no citation are dropped."""

    def to_citations(labels: list[str]) -> list[Citation]:
        citations: list[Citation] = []
        seen: set[tuple[str, str]] = set()
        for label in labels:
            chunk = labelled.get(label)
            if chunk is None:  # label the LLM made up
                continue
            m = chunk.metadata
            key = (m["sourceType"], m["sourceId"])
            if key in seen:  # several chunks of one source -> one citation
                continue
            seen.add(key)
            citations.append(
                Citation(
                    sourceType=m["sourceType"],
                    sourceId=m["sourceId"],
                    jobId=m["jobId"],
                    title=m["title"],
                )
            )
        return citations

    questions = [
        LikelyQuestion(question=q.question, why=q.why, citations=c)
        for q in llm.likelyQuestions
        if (c := to_citations(q.citations))
    ]
    weak_spots = [
        WeakSpot(topic=w.topic, detail=w.detail, citations=c)
        for w in llm.weakSpots
        if (c := to_citations(w.citations))
    ]
    study_plan = [
        StudyItem(item=s.item, citations=c)
        for s in llm.studyPlan
        if (c := to_citations(s.citations))
    ]
    if not (questions or weak_spots or study_plan):
        return _insufficient()
    return PrepResult(
        insufficientData=False,
        likelyQuestions=questions,
        weakSpots=weak_spots,
        studyPlan=study_plan,
    )


def _build_user_message(req: PrepRequest, labelled: dict[str, RetrievedChunk]) -> str:
    sources = "\n\n".join(
        f"[{label}] ({c.metadata['sourceType']}, {c.metadata['title']})\n{c.metadata['text']}"
        for label, c in labelled.items()
    )
    profile = req.profile
    return (
        f"Job: {req.jobTitle} at {req.company}\n"
        f"Focus: {req.focus or 'general preparation'}\n"
        f"Candidate skills: {', '.join(profile.skills) or 'not given'}\n"
        f"Target role: {profile.targetRole or 'not given'}\n"
        f"Seniority: {profile.seniority}\n\n"
        f"Sources:\n{sources}"
    )


def run_prep(store: UserStore, chat, req: PrepRequest) -> PrepResult:
    chunks = retrieve(store, req)
    if not chunks:
        return _insufficient()  # nothing to ground on, so don't pay for an LLM call

    labelled = {f"S{i}": chunk for i, chunk in enumerate(chunks, start=1)}
    structured = chat.with_structured_output(LLMPrep)
    llm_result = structured.invoke(
        [
            ("system", PREP_SYSTEM_PROMPT),
            ("human", _build_user_message(req, labelled)),
        ]
    )
    return apply_citation_guard(llm_result, labelled)


def get_chat():
    """FastAPI dependency. Built lazily so tests (which override it) need no real key."""
    from langchain_openai import ChatOpenAI

    settings = get_settings()
    return ChatOpenAI(
        model=settings.openai_chat_model, temperature=0, api_key=settings.openai_api_key
    )
