"""UserStore: the ONLY code in this service that touches Pinecone.

Security boundary: one user must never read or delete another user's vectors.
Two rules enforce that, and both live in this file:
  1. Every vector ID starts with "{user_id}#", so list/delete-by-prefix is
     scoped to one user (user_id may not contain "#", or prefixes could overlap).
  2. Every query carries a {"userId": {"$eq": user_id}} filter that callers
     cannot remove, only add to.
"""
import time
from dataclasses import dataclass
from functools import lru_cache

from app.chunking import chunk_source, vector_id_prefix
from app.config import get_settings
from app.schemas import IndexSource, SourceRef

BATCH_SIZE = 100  # well under Pinecone's per-call limits for upsert and delete
EMBED_BATCH_SIZE = 500  # texts per OpenAI embeddings request (its limit is 2048)


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
        """Replace each source's vectors with freshly chunked ones. Returns chunk count.

        Work is batched across all sources so a call stays fast: delete every
        source's old vectors, embed all new chunks together (one OpenAI request
        per 500 texts), then upsert in batches of 100.

        Pinecone serverless is eventually consistent: for a moment after this
        returns, a query may still see an old chunk or miss a new one. That is
        fine for prep, which runs much later than a save.
        """
        # Delete first: a shorter edit would otherwise leave stale trailing chunks.
        self.delete_sources(sources)

        chunks = [chunk for source in sources for chunk in chunk_source(self._user_id, source)]
        vectors: list[list[float]] = []
        for batch in _batches(chunks, EMBED_BATCH_SIZE):
            vectors += self._embeddings.embed_documents([c.text for c in batch])

        records = [
            {"id": c.id, "values": values, "metadata": c.metadata}
            for c, values in zip(chunks, vectors)
        ]
        for batch in _batches(records):
            self._index.upsert(vectors=batch, namespace=self._namespace)
        return len(chunks)

    def delete_sources(self, refs: list[SourceRef] | list[IndexSource]) -> None:
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

    def wait_for_namespace_count(
        self,
        expected: int,
        timeout_s: float = 60,
        poll_s: float = 2,
        sleep=time.sleep,
        clock=time.monotonic,
        log=print,
    ) -> bool:
        """Block until this store's namespace holds at least `expected` vectors.

        Used by the eval harness: Pinecone serverless is eventually consistent, so
        queries sent right after an upsert can miss fresh vectors. Reads only the
        namespace-wide count (no vector data). Returns False on timeout.
        """
        deadline = clock() + timeout_s
        while True:
            stats = self._index.describe_index_stats()
            summary = stats.namespaces.get(self._namespace or "__default__")
            count = summary.vector_count if summary else 0
            if count >= expected:
                return True
            if clock() >= deadline:
                return False
            log(f"Waiting for Pinecone: {count}/{expected} vectors visible")
            sleep(poll_s)

    def _delete_by_prefix(self, prefix: str) -> None:
        # Safety net: never delete anything outside this user's ID space.
        assert prefix.startswith(f"{self._user_id}#")
        # index.list yields pages whose .vectors each carry an .id; collect all ids
        # first so we aren't deleting while paginating.
        pages = self._index.list(prefix=prefix, namespace=self._namespace)
        ids = [item.id for page in pages for item in page.vectors]
        for batch in _batches(ids):
            self._index.delete(ids=batch, namespace=self._namespace)


@lru_cache
def _clients(pinecone_api_key: str, pinecone_index: str, openai_api_key: str):
    """Pinecone index handle and embeddings client, built once per process.

    Building them costs network round trips (Index() describes the index), so
    they are shared across requests. Only the per-user UserStore is per request.
    """
    from langchain_openai import OpenAIEmbeddings
    from pinecone import Pinecone

    index = Pinecone(api_key=pinecone_api_key).Index(pinecone_index)
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=openai_api_key)
    return index, embeddings


def get_store(user_id: str, namespace: str | None = None) -> UserStore:
    """Build the real store. Clients are created lazily so tests (which override
    this dependency) never need real keys.
    namespace overrides the configured one (the eval suite uses "eval")."""
    settings = get_settings()
    index, embeddings = _clients(
        settings.pinecone_api_key, settings.pinecone_index, settings.openai_api_key
    )
    if namespace is None:
        namespace = settings.pinecone_namespace
    return UserStore(index, embeddings, user_id, namespace)


def get_store_factory():
    """FastAPI dependency returning the factory. The userId comes from each request
    body, so routes call the factory themselves; tests override this to inject fakes."""
    return get_store
