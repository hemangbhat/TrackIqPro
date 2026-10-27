"""UserStore: the ONLY code in this service that touches Pinecone.

Security boundary: one user must never read or delete another user's vectors.
Two rules enforce that, and both live in this file:
  1. Every vector ID starts with "{user_id}#", so list/delete-by-prefix is
     scoped to one user (user_id may not contain "#", or prefixes could overlap).
  2. Every query carries a {"userId": {"$eq": user_id}} filter that callers
     cannot remove, only add to.
"""
from dataclasses import dataclass

from app.chunking import chunk_source, vector_id_prefix
from app.config import get_settings
from app.schemas import IndexSource, SourceRef

BATCH_SIZE = 100  # well under Pinecone's per-call limits for upsert and delete


@dataclass
class RetrievedChunk:
    id: str
    score: float
    metadata: dict


def _batches(items: list, size: int = BATCH_SIZE):
    for start in range(0, len(items), size):
        yield items[start : start + size]


class UserStore:
    def __init__(self, index, embeddings, user_id: str, namespace: str = ""):
        if not user_id:
            raise ValueError("user_id is required")
        if "#" in user_id:
            # "#" is our ID separator: user "a#b" would share prefixes with user "a".
            raise ValueError("user_id must not contain '#'")
        self._index = index
        self._embeddings = embeddings
        self._user_id = user_id
        self._namespace = namespace

    def upsert_sources(self, sources: list[IndexSource]) -> int:
        """Replace each source's vectors with freshly chunked ones. Returns chunk count."""
        total = 0
        for source in sources:
            # Delete first: a shorter edit would otherwise leave stale trailing chunks.
            self._delete_by_prefix(
                vector_id_prefix(self._user_id, source.sourceType, source.sourceId)
            )
            chunks = chunk_source(self._user_id, source)
            for batch in _batches(chunks):
                vectors = self._embeddings.embed_documents([c.text for c in batch])
                self._index.upsert(
                    vectors=[
                        {"id": c.id, "values": values, "metadata": c.metadata}
                        for c, values in zip(batch, vectors)
                    ],
                    namespace=self._namespace,
                )
            total += len(chunks)
        return total

    def delete_sources(self, refs: list[SourceRef]) -> None:
        for ref in refs:
            self._delete_by_prefix(
                vector_id_prefix(self._user_id, ref.sourceType, ref.sourceId)
            )

    def delete_all(self) -> None:
        self._delete_by_prefix(f"{self._user_id}#")

    def query(self, text: str, k: int, filter: dict) -> list[RetrievedChunk]:
        # The userId condition is always first and always present.
        scoped_filter = {"$and": [{"userId": {"$eq": self._user_id}}, filter]}
        result = self._index.query(
            vector=self._embeddings.embed_query(text),
            top_k=k,
            filter=scoped_filter,
            include_metadata=True,
            namespace=self._namespace,
        )
        return [
            RetrievedChunk(id=m["id"], score=m["score"], metadata=m["metadata"])
            for m in result["matches"]
        ]

    def _delete_by_prefix(self, prefix: str) -> None:
        # Safety net: never delete anything outside this user's ID space.
        assert prefix.startswith(f"{self._user_id}#")
        # index.list yields pages whose .vectors each carry an .id; collect all ids
        # first so we aren't deleting while paginating.
        pages = self._index.list(prefix=prefix, namespace=self._namespace)
        ids = [item.id for page in pages for item in page.vectors]
        for batch in _batches(ids):
            self._index.delete(ids=batch, namespace=self._namespace)


def get_store(user_id: str) -> UserStore:
    """Build the real store. Imports and clients are created lazily so tests
    (which override this dependency) never need real keys."""
    from langchain_openai import OpenAIEmbeddings
    from pinecone import Pinecone

    settings = get_settings()
    index = Pinecone(api_key=settings.pinecone_api_key).Index(settings.pinecone_index)
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small", api_key=settings.openai_api_key
    )
    return UserStore(index, embeddings, user_id, settings.pinecone_namespace)


def get_store_factory():
    """FastAPI dependency returning the factory. The userId comes from each request
    body, so routes call the factory themselves; tests override this to inject fakes."""
    return get_store
