import pytest

from evals.metrics import citation_validity, hit, recall_at_k
from app.schemas import Citation, LikelyQuestion, PrepResult, StudyItem


def cite(source_id: str) -> Citation:
    return Citation(sourceType="note", sourceId=source_id, jobId="j", title="t")


def test_recall_partial():
    assert recall_at_k({"a", "b"}, ["a", "c"]) == 0.5


def test_recall_full_and_none():
    assert recall_at_k({"a"}, ["a", "b"]) == 1.0
    assert recall_at_k({"a"}, ["b"]) == 0.0


def test_recall_empty_expected_is_one():
    assert recall_at_k(set(), ["x"]) == 1.0


def test_hit():
    assert hit({"a", "b"}, ["a", "c"]) is True
    assert hit({"a"}, ["c"]) is False
    assert hit(set(), ["c"]) is False  # nothing expected, nothing to hit


def test_citation_validity_two_of_three():
    result = PrepResult(
        insufficientData=False,
        likelyQuestions=[LikelyQuestion(question="q", why="w", citations=[cite("a"), cite("b")])],
        studyPlan=[StudyItem(item="i", citations=[cite("zzz")])],
    )
    assert citation_validity(result, {"a", "b"}) == pytest.approx(2 / 3)


def test_citation_validity_no_citations_is_one():
    assert citation_validity(PrepResult(insufficientData=True), set()) == 1.0


def test_judge_groundedness_uses_structured_output():
    from evals.metrics import JudgeVerdict, judge_groundedness

    class FakeChat:
        def with_structured_output(self, schema):
            assert schema is JudgeVerdict
            return self

        def invoke(self, messages):
            assert "SOURCE 1" in messages[1][1] and "my item" in messages[1][1]
            return JudgeVerdict(supported=True, reason="ok")

    assert judge_groundedness(FakeChat(), "my item", ["text"]) is True
    assert judge_groundedness(FakeChat(), "my item", []) is False  # nothing cited, nothing supported
