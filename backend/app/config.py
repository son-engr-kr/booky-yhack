from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    frontend_url: str = "http://localhost:3000"
    host: str = "0.0.0.0"
    port: int = 8001

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "booky"

    # GCP (for Vertex AI Imagen)
    gcp_credentials_path: str = "./firebase-service-account.json"

    # K2 Think V2
    k2_api_key: str = ""
    k2_api_url: str = "https://api.k2think.ai/v1/chat/completions"
    k2_model: str = "MBZUAI-IFM/K2-Think-v2"

    # ChromaDB
    chroma_persist_dir: str = "./chroma_data"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
