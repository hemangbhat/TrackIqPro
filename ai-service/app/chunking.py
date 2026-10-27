from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.schemas import IndexSource

splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)


@dataclass
class Chunk:
    id: str
    text: str
    metadata: dict


def vector_id_prefix(user_id: str, source_type: str, source_id: str) -> str:
    # Every vector ID starts with the user ID, so a user's (or one source's)
    # vectors can be listed and deleted by prefix.
    return f"{user_id}#{source_type}#{source_id}#"


def chunk_source(user_id: str, source: IndexSource) -> list[Chunk]:
    if not source.text.strip():
        return []

    prefix = vector_id_prefix(user_id, source.sourceType, source.sourceId)
    base_metadata = source.model_dump(exclude={"text"})
    base_metadata["userId"] = user_id

    chunks = []
    for index, piece in enumerate(splitter.split_text(source.text)):
        metadata = {**base_metadata, "chunkIndex": index, "text": piece}
        chunks.append(Chunk(id=f"{prefix}{index}", text=piece, metadata=metadata))
    return chunks
