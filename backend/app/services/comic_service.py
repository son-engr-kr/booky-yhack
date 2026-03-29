"""6-panel comic recap using K2 for scene descriptions + Vertex AI Imagen for images."""
import base64
import json
from google.oauth2 import service_account
from google.auth.transport.requests import Request as AuthRequest
import httpx
from app.config import settings
from app.services import k2

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
PROJECT_ID = "theta-bliss-486220-s1"
LOCATION = "us-east1"
IMAGEN_MODEL = "imagegeneration@006"
IMAGEN_URL = (
    f"https://{LOCATION}-aiplatform.googleapis.com/v1/"
    f"projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{IMAGEN_MODEL}:predict"
)


def _get_access_token() -> str:
    """Get OAuth2 access token from service account."""
    creds = service_account.Credentials.from_service_account_file(
        settings.firebase_credentials_path, scopes=SCOPES
    )
    creds.refresh(AuthRequest())
    return creds.token


async def generate_scene_prompts(book_title: str, author: str, chapters_summary: str) -> list[dict]:
    """Use K2 to generate 6 scene descriptions for comic panels."""
    result = await k2.chat([
        {"role": "system", "content": (
            "You create image generation prompts for a 6-panel comic recap of a book. "
            "Each panel captures a key moment from the story. "
            "Return JSON array of 6 objects:\n"
            '[{"panel": 1, "title": "2-3 words", "description": "1 sentence story moment", '
            '"image_prompt": "detailed visual description for image generation, '
            'comic/illustration style, specific scene details, lighting, mood, characters"}]'
        )},
        {"role": "user", "content": (
            f"Book: {book_title} by {author}\n"
            f"Story so far:\n{chapters_summary}\n\n"
            "Create 6 comic panel prompts. Make image_prompt very detailed and visual."
        )},
    ], temperature=0.8)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(clean)
    except (json.JSONDecodeError, IndexError):
        return []


async def generate_image(prompt: str) -> str | None:
    """Generate an image using Vertex AI Imagen. Returns base64 encoded image."""
    token = _get_access_token()
    styled_prompt = f"Comic book illustration style, vibrant colors, clean lines: {prompt}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            IMAGEN_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "instances": [{"prompt": styled_prompt}],
                "parameters": {
                    "sampleCount": 1,
                    "aspectRatio": "1:1",
                    "safetyFilterLevel": "block_few",
                },
            },
        )
        if resp.status_code != 200:
            print(f"Imagen error {resp.status_code}: {resp.text[:200]}")
            return None
        data = resp.json()
        predictions = data.get("predictions", [])
        if predictions:
            return predictions[0].get("bytesBase64Encoded")
    return None


async def generate_comic(book_title: str, author: str, chapters_summary: str) -> list[dict]:
    """Generate full 6-panel comic: scenes + images."""
    panels = await generate_scene_prompts(book_title, author, chapters_summary)
    if not panels:
        return []

    results = []
    for panel in panels:
        image_b64 = await generate_image(panel.get("image_prompt", panel.get("description", "")))
        results.append({
            "panel": panel.get("panel"),
            "title": panel.get("title"),
            "description": panel.get("description"),
            "image": f"data:image/png;base64,{image_b64}" if image_b64 else None,
        })

    return results
