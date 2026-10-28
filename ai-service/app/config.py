"""Settings read from environment variables (names are the upper-cased field names)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ai_service_secret: str
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
