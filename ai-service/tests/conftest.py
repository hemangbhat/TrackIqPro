"""Set dummy env vars before the app is imported, so Settings can load."""
import os

os.environ["AI_SERVICE_SECRET"] = "test-secret"
os.environ["OPENAI_API_KEY"] = "test-openai"
os.environ["OPENAI_CHAT_MODEL"] = "test-model"
os.environ["PINECONE_API_KEY"] = "test-pinecone"
os.environ["PINECONE_INDEX"] = "test-index"
