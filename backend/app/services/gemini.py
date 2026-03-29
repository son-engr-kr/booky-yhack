"""Gemini API via Vertex AI for book Q&A."""
import os
import httpx
import google.auth
from google.oauth2 import service_account
from google.auth.transport.requests import Request as AuthRequest
from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
PROJECT_ID = "theta-bliss-486220-s1"
LOCATION = "us-central1"
MODEL = "gemini-2.0-flash"
URL = (
    f"https://{LOCATION}-aiplatform.googleapis.com/v1/"
    f"projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL}:generateContent"
)


def _get_token() -> str:
    if os.path.exists(settings.gcp_credentials_path):
        creds = service_account.Credentials.from_service_account_file(
            settings.gcp_credentials_path, scopes=SCOPES
        )
    else:
        creds, _ = google.auth.default(scopes=SCOPES)
    creds.refresh(AuthRequest())
    return creds.token


async def ask_about_book(
    question: str,
    passage: str,
    book_title: str,
    author: str,
    chapter_num: int,
) -> str:
    """Answer a question about a book passage using Gemini."""
    token = _get_token()
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": (
                    f"You are a knowledgeable literary assistant helping a reader understand "
                    f"'{book_title}' by {author}. The reader is on chapter {chapter_num}.\n\n"
                    f"IMPORTANT: Do NOT spoil anything beyond chapter {chapter_num}. "
                    f"Only discuss what has been revealed up to this point.\n\n"
                    f"Selected passage:\n\"{passage}\"\n\n"
                    f"Reader's question: {question}\n\n"
                    f"Give a thoughtful, concise answer (2-4 sentences). "
                    f"Be insightful but accessible."
                )}],
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 300,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            URL,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
