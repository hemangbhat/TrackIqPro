import hmac

from fastapi import Depends, FastAPI, Header, HTTPException

from app.config import Settings, get_settings

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
