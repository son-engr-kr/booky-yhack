from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    frontend_url: str = "http://localhost:3000"
    host: str = "0.0.0.0"
    port: int = 8001

    # Firebase
    firebase_credentials_path: str = "./firebase-service-account.json"
    use_firebase_emulator: bool = True
    firestore_emulator_host: str = "localhost:8080"
    auth_emulator_host: str = "localhost:9099"

    # ChromaDB
    chroma_persist_dir: str = "./chroma_data"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
