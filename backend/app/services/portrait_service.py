"""Generate and cache character portrait illustrations via Vertex AI Imagen."""
import asyncio
from google.oauth2 import service_account
from google.auth.transport.requests import Request as AuthRequest
import httpx
from app.config import settings
from app.database import db

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
PROJECT_ID = "theta-bliss-486220-s1"
LOCATION = "us-central1"
IMAGEN_MODEL = "imagen-3.0-fast-generate-001"
IMAGEN_URL = (
    f"https://{LOCATION}-aiplatform.googleapis.com/v1/"
    f"projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{IMAGEN_MODEL}:predict"
)
COL = "character_portraits"


def _get_token() -> str:
    creds = service_account.Credentials.from_service_account_file(
        settings.gcp_credentials_path, scopes=SCOPES
    )
    creds.refresh(AuthRequest())
    return creds.token


def get_cached_portrait(book_id: str, character_id: str) -> str | None:
    doc = db[COL].find_one({"_id": f"{book_id}_{character_id}"})
    return doc.get("image") if doc else None


def save_portrait(book_id: str, character_id: str, image: str):
    db[COL].replace_one(
        {"_id": f"{book_id}_{character_id}"},
        {"_id": f"{book_id}_{character_id}", "bookId": book_id, "characterId": character_id, "image": image},
        upsert=True,
    )


async def generate_portrait(name: str, role: str, description: str, book_title: str, token: str) -> str | None:
    """Generate a character portrait illustration."""
    prompt = (
        f"Character portrait illustration, book illustration style, soft watercolor, "
        f"warm tones, clean simple lines, white background, bust shot: "
        f"{name}, {role} from '{book_title}'. {description}. "
        f"Literary character portrait, expressive face, period-appropriate clothing."
    )
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            IMAGEN_URL,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "instances": [{"prompt": prompt}],
                "parameters": {"sampleCount": 1, "aspectRatio": "1:1"},
            },
        )
        if resp.status_code != 200:
            print(f"[Portrait] error {resp.status_code}: {resp.text[:200]}")
            return None
        predictions = resp.json().get("predictions", [])
        if predictions:
            b64 = predictions[0].get("bytesBase64Encoded")
            return f"data:image/png;base64,{b64}" if b64 else None
    return None


async def generate_portraits_for_book(book_id: str, characters: list[dict], book_title: str) -> list[dict]:
    """Generate portraits for all characters, using cache when available."""
    token = _get_token()
    results = []

    to_generate = []
    for char in characters:
        cid = char.get("id", "")
        cached = get_cached_portrait(book_id, cid)
        if cached:
            results.append({"characterId": cid, "image": cached, "cached": True})
        else:
            to_generate.append(char)

    if to_generate:
        images = await asyncio.gather(*[
            generate_portrait(
                c.get("name", ""), c.get("role", ""), c.get("description", ""),
                book_title, token
            )
            for c in to_generate
        ])
        for char, img in zip(to_generate, images):
            cid = char.get("id", "")
            if img:
                save_portrait(book_id, cid, img)
            results.append({"characterId": cid, "image": img, "cached": False})

    return results
