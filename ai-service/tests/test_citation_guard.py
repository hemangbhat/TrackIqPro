from app.prep import apply_citation_guard
from app.schemas import Citation, LLMPrep, LLMQuestion, LLMStudyItem, LLMWeakSpot
from app.store import RetrievedChunk

EMPTY_COPY = "Add notes from your rounds to get prep tailored to you"


def chunk(source_id="n1", title="Round 2"):
    return RetrievedChunk(
        id=f"u1#note#{source_id}#0",
        score=1.0,
        metadata={"sourceType": "note", "sourceId": source_id, "jobId": "j1", "title": title},
    )


def prep_with_question(citations):
    return LLMPrep(
        insufficientData=False,
        likelyQuestions=[LLMQuestion(question="q", why="w", citations=citations)],
    )


def test_unknown_label_dropped_and_item_kept_if_other_citation_valid():
    result = apply_citation_guard(prep_with_question(["S1", "S9"]), {"S1": chunk()})
    assert len(result.likelyQuestions) == 1
    assert len(result.likelyQuestions[0].citations) == 1


def test_item_with_only_invalid_citations_removed():
    llm = LLMPrep(
        insufficientData=False,
        likelyQuestions=[LLMQuestion(question="q", why="w", citations=["S9"])],
        weakSpots=[LLMWeakSpot(topic="t", detail="d", citations=["S1"])],
    )
    result = apply_citation_guard(llm, {"S1": chunk()})
    assert result.likelyQuestions == []
    assert len(result.weakSpots) == 1


def test_item_with_no_citations_removed():
    llm = LLMPrep(
        insufficientData=False,
        studyPlan=[
            LLMStudyItem(item="uncited", citations=[]),
            LLMStudyItem(item="cited", citations=["S1"]),
        ],
    )
    result = apply_citation_guard(llm, {"S1": chunk()})
    assert [s.item for s in result.studyPlan] == ["cited"]


def test_all_items_removed_sets_insufficient():
    result = apply_citation_guard(prep_with_question(["S9"]), {"S1": chunk()})
    assert result.insufficientData is True
    assert result.message == EMPTY_COPY


def test_citation_maps_metadata():
    result = apply_citation_guard(prep_with_question(["S1"]), {"S1": chunk()})
    assert result.likelyQuestions[0].citations == [
        Citation(sourceType="note", sourceId="n1", jobId="j1", title="Round 2")
    ]


def test_citations_from_same_source_are_deduplicated():
    labelled = {"S1": chunk(), "S2": chunk()}  # two chunks of the same note
    result = apply_citation_guard(prep_with_question(["S1", "S2"]), labelled)
    assert len(result.likelyQuestions[0].citations) == 1
