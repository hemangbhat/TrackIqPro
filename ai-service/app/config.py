"""Settings read from environment variables (names are the upper-cased field names)."""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # An empty secret would match a request with no X-AI-Service-Key header at
    # all, so refuse to start without a real one. Use a long random string.
    ai_service_secret: str = Field(min_length=8)
    openai_api_key: str
    openai_chat_model: str
    pinecone_api_key: str
    pinecone_index: str
    pinecone_namespace: str = ""
    mongodb_uri: str | None = None


@lru_cache
def get_settings() -> Settings:
    """Cached so the environment is parsed once, not on every request."""
    return Settings()
