import hmac

from typing import Callable

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.schemas import IndexSource, SourceRef
from app.store import UserStore, get_store_factory

app = FastAPI(title="TrackIQ AI service")


def require_service_key(
    x_ai_service_key: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    """Only the Next.js server knows the shared secret; browsers never call us.

    compare_digest takes constant time, so response timing can't leak the secret.
    """
    supplied = x_ai_service_key or ""
    if not hmac.compare_digest(supplied.encode(), settings.ai_service_secret.encode()):
        raise HTTPException(status_code=401, detail="Invalid service key")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/prep", dependencies=[Depends(require_service_key)])
def prep() -> None:
    """Placeholder until the real prep flow is built."""
    raise HTTPException(status_code=501, detail="Not implemented")


class IndexRequest(BaseModel):
    userId: str
    sources: list[IndexSource]


class DeleteSourcesRequest(BaseModel):
    userId: str
    sources: list[SourceRef]


StoreFactory = Callable[[str], UserStore]


def _store_for(factory: StoreFactory, user_id: str) -> UserStore:
    try:
        return factory(user_id)
    except ValueError as exc:  # empty or malformed userId
        raise HTTPException(status_code=422, detail=str(exc))


@app.post("/index", dependencies=[Depends(require_service_key)])
def index_sources(body: IndexRequest, factory: StoreFactory = Depends(get_store_factory)) -> dict:
    return {"indexed": _store_for(factory, body.userId).upsert_sources(body.sources)}


@app.post("/index/delete", dependencies=[Depends(require_service_key)])
def delete_sources(
    body: DeleteSourcesRequest, factory: StoreFactory = Depends(get_store_factory)
) -> dict:
    _store_for(factory, body.userId).delete_sources(body.sources)
    return {"deleted": True}


@app.delete("/users/{userId}", dependencies=[Depends(require_service_key)])
def delete_user(userId: str, factory: StoreFactory = Depends(get_store_factory)) -> dict:
    _store_for(factory, userId).delete_all()
    return {"deleted": True}
