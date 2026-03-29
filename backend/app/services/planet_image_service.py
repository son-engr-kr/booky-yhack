"""Planet image generation based on reading profile using K2 + Vertex AI Imagen."""
import asyncio
import json
from app.services import k2
from app.services.comic_service import generate_image, _get_access_token
from app.database import db


async def build_planet_prompt(user_data: dict, profile: dict | None = None) -> str:
    """Use K2 to generate a creative planet image prompt based on reading profile."""
    genres = user_data.get("genres", {})
    planet_style = user_data.get("planetStyle", "")
    name = user_data.get("name", "Reader")

    profile_desc = ""
    if profile:
        spectrum = profile.get("spectrum", [])
        radar = profile.get("radar", {})
        tendencies = profile.get("tendencies", [])
        profile_desc = (
            f"Personality spectrum: {json.dumps(spectrum)}\n"
            f"Radar traits: {json.dumps(radar)}\n"
            f"Tendencies: {json.dumps(tendencies)}\n"
        )

    result = await k2.chat([
        {"role": "system", "content": (
            "You generate image prompts for unique fantasy planets. "
            "Each planet should visually reflect the reader's personality and taste. "
            "Genre preferences shape the planet's biome/terrain. "
            "Personality traits shape the atmosphere, colors, and mood. "
            "Return ONLY a single detailed image generation prompt (no JSON, no explanation). "
            "The prompt should describe a single planet floating in space, seen from a slight distance. "
            "Style: digital art, vibrant colors, ethereal glow, detailed surface textures. "
            "Keep it under 120 words."
        )},
        {"role": "user", "content": (
            f"Reader: {name}\n"
            f"Genre preferences: {json.dumps(genres)}\n"
            f"Planet style hint: {planet_style}\n"
            f"{profile_desc}\n"
            "Generate a unique planet image prompt that reflects this reader's soul."
        )},
    ], temperature=0.9)

    return result.strip()


async def generate_planet_image(user_id: str, profile: dict | None = None) -> str | None:
    """Generate a planet image for a user and save to DB."""
    user = db.users.find_one({"_id": user_id})
    if not user:
        return None

    prompt = await build_planet_prompt(user, profile)
    styled = f"Fantasy planet floating in space, digital art, vibrant ethereal glow, detailed: {prompt}"

    token = _get_access_token()
    image = await generate_image(styled, token)

    if image:
        db.users.update_one(
            {"_id": user_id},
            {"$set": {"generatedPlanetImage": image}}
        )

    return image


async def generate_all_planet_images(profile: dict | None = None) -> list[dict]:
    """Generate planet images for ALL users. Debug endpoint."""
    users = list(db.users.find())
    token = _get_access_token()

    results = []
    for user in users:
        uid = user["_id"]
        prompt = await build_planet_prompt(user, profile)
        styled = f"Fantasy planet floating in space, digital art, vibrant ethereal glow, detailed: {prompt}"
        image = await generate_image(styled, token)
        if image:
            db.users.update_one({"_id": uid}, {"$set": {"generatedPlanetImage": image}})
        results.append({"userId": uid, "name": user.get("name", uid), "success": image is not None})

    return results
