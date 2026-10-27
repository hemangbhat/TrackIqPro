from typing import Literal

from pydantic import BaseModel

SourceType = Literal["job_description", "job_notes", "note"]


class IndexSource(BaseModel):
    sourceType: SourceType
    sourceId: str
    jobId: str  # "none" when the source is not tied to a job
    company: str = ""
    title: str
    round: str = ""
    createdAt: str  # ISO timestamp
    text: str


class SourceRef(BaseModel):
    sourceType: SourceType
    sourceId: str
