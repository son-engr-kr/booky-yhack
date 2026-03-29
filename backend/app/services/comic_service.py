"""6-panel comic recap using K2 for scene descriptions + Vertex AI Imagen for images."""
import asyncio
import json
import os
import google.auth
from google.oauth2 import service_account
from google.auth.transport.requests import Request as AuthRequest
import httpx
from app.config import settings
from app.services import k2

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
PROJECT_ID = "theta-bliss-486220-s1"
LOCATION = "us-central1"
IMAGEN_MODEL = "imagen-3.0-fast-generate-001"
IMAGEN_URL = (
    f"https://{LOCATION}-aiplatform.googleapis.com/v1/"
    f"projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{IMAGEN_MODEL}:predict"
)


def _get_access_token() -> str:
    """Get OAuth2 access token — uses service account file locally, default credentials on Cloud Run."""
    if os.path.exists(settings.gcp_credentials_path):
        creds = service_account.Credentials.from_service_account_file(
            settings.gcp_credentials_path, scopes=SCOPES
        )
    else:
        creds, _ = google.auth.default(scopes=SCOPES)
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


async def generate_image(prompt: str, token: str, retries: int = 2) -> str | None:
    """Generate a single panel image using Vertex AI Imagen Fast with retry."""
    styled = f"Comic book panel, illustration style, vibrant colors, clean ink lines: {prompt}"
    for attempt in range(retries + 1):
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                IMAGEN_URL,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "instances": [{"prompt": styled}],
                    "parameters": {"sampleCount": 1, "aspectRatio": "1:1"},
                },
            )
            if resp.status_code == 200:
                predictions = resp.json().get("predictions", [])
                if predictions:
                    b64 = predictions[0].get("bytesBase64Encoded")
                    if b64:
                        return f"data:image/png;base64,{b64}"
            print(f"[Imagen] attempt {attempt+1} failed ({resp.status_code}): {resp.text[:200]}")
            if attempt < retries:
                await asyncio.sleep(1.5 * (attempt + 1))
    return None


async def generate_comic(book_title: str, author: str, chapters_summary: str) -> dict:
    """Generate 6-panel comic: scene descriptions + 6 images with staggered requests."""
    panels = await generate_scene_prompts(book_title, author, chapters_summary)
    if not panels:
        return {"image": None, "panels": []}

    token = _get_access_token()

    # Stagger requests in batches of 3 to avoid rate limits
    batch1 = panels[:3]
    batch2 = panels[3:]

    images1 = await asyncio.gather(*[
        generate_image(p.get("image_prompt") or p.get("description", ""), token)
        for p in batch1
    ])
    images2 = await asyncio.gather(*[
        generate_image(p.get("image_prompt") or p.get("description", ""), token)
        for p in batch2
    ])
    images = list(images1) + list(images2)

    result_panels = [
        {
            "panel": p.get("panel"),
            "title": p.get("title"),
            "description": p.get("description"),
            "image": img,
        }
        for p, img in zip(panels, images)
    ]
    return {"image": None, "panels": result_panels}
