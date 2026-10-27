"""In-memory stand-ins for the Pinecone index and OpenAI embeddings.

FakeIndex mirrors the real serverless client's signatures and return shapes:
  upsert(vectors=[{"id","values","metadata"}], namespace=...)
  list(prefix=..., namespace=...)  -> generator of pages; page.vectors[i].id is an id
      (pinecone v10 yields ListResponse objects, not bare id lists)
  delete(ids=[...], namespace=...)
  query(vector=..., top_k=..., filter=..., include_metadata=True, namespace=...)
      -> {"matches": [{"id","score","metadata"}]}
"""
from __future__ import annotations  # the `list` method below shadows the builtin in annotations

from types import SimpleNamespace


class FakeEmbeddings:
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_query(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return [float(len(text)), 1.0, 0.0]


class FakeIndex:
    def __init__(self, list_page_size: int = 100):
        self.vectors: dict[str, dict] = {}  # id -> {"values", "metadata"}
        self.upsert_batches: list[int] = []
        self.delete_batches: list[int] = []
        self.query_filters: list[dict] = []
        self.list_page_size = list_page_size

    def upsert(self, vectors: list[dict], namespace: str = "") -> None:
        self.upsert_batches.append(len(vectors))
        for v in vectors:
            self.vectors[v["id"]] = {"values": v["values"], "metadata": v["metadata"]}

    def list(self, prefix: str = "", namespace: str = ""):
        ids = sorted(i for i in self.vectors if i.startswith(prefix))
        for start in range(0, len(ids), self.list_page_size):
            page_ids = ids[start : start + self.list_page_size]
            yield SimpleNamespace(vectors=[SimpleNamespace(id=i) for i in page_ids])

    def delete(self, ids: list[str], namespace: str = "") -> None:
        self.delete_batches.append(len(ids))
        for i in ids:
            self.vectors.pop(i, None)

    def query(
        self,
        vector: list[float],
        top_k: int,
        filter: dict,
        include_metadata: bool = False,
        namespace: str = "",
    ) -> dict:
        self.query_filters.append(filter)
        # Supports only the {"$and": [{field: {"$eq": v}}, ...]} shape UserStore sends.
        conditions = filter["$and"]
        matches = []
        for vid, v in self.vectors.items():
            if all(
                v["metadata"].get(field) == cond["$eq"]
                for c in conditions
                for field, cond in c.items()
            ):
                matches.append({"id": vid, "score": 1.0, "metadata": v["metadata"]})
        return {"matches": matches[:top_k]}
