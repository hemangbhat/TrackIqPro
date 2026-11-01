from typing import Literal

from pydantic import BaseModel, Field

SourceType = Literal["job_description", "job_notes", "note"]

# Above the Next.js field caps (20k chars plus a title prefix); bounds the
# embedding cost of one source that arrives over HTTP even if a caller skips
# those caps. The operator reindex script builds IndexSource directly.
MAX_SOURCE_TEXT = 25_000


class IndexSource(BaseModel):
    sourceType: SourceType
    sourceId: str
    jobId: str  # "none" when the source is not tied to a job
    company: str = ""
    title: str
    round: str = ""
    createdAt: str  # ISO timestamp
    text: str


class ApiIndexSource(IndexSource):
    """An IndexSource received on the /index route, with a size cap."""

    text: str = Field(max_length=MAX_SOURCE_TEXT)


class SourceRef(BaseModel):
    sourceType: SourceType
    sourceId: str


# --- Prep request / response ---


class Profile(BaseModel):
    skills: list[str] = []
    targetRole: str = ""
    seniority: str = "mid"


class PrepRequest(BaseModel):
    userId: str
    jobId: str
    jobTitle: str
    company: str
    focus: str = ""
    profile: Profile


class Citation(BaseModel):
    sourceType: SourceType
    sourceId: str
    jobId: str
    title: str


class LikelyQuestion(BaseModel):
    question: str
    why: str
    citations: list[Citation]


class WeakSpot(BaseModel):
    topic: str
    detail: str
    citations: list[Citation]


class StudyItem(BaseModel):
    item: str
    citations: list[Citation]


class PrepResult(BaseModel):
    insufficientData: bool
    message: str = ""
    likelyQuestions: list[LikelyQuestion] = []
    weakSpots: list[WeakSpot] = []
    studyPlan: list[StudyItem] = []


# --- What the LLM returns: same shape, but citations are raw "S#" labels the guard must verify ---


class LLMQuestion(BaseModel):
    question: str
    why: str
    citations: list[str]


class LLMWeakSpot(BaseModel):
    topic: str
    detail: str
    citations: list[str]


class LLMStudyItem(BaseModel):
    item: str
    citations: list[str]


class LLMPrep(BaseModel):
    insufficientData: bool
    likelyQuestions: list[LLMQuestion]
    weakSpots: list[LLMWeakSpot]
    studyPlan: list[LLMStudyItem]
