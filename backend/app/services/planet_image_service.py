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
            "You generate image prompts for seamless PLANET SURFACE TEXTURES. "
            "Think satellite photography of alien planets — like NASA images of Mars, Jupiter, or Europa surfaces. "
            "The texture must fill the ENTIRE image edge to edge with NO borders, NO horizon, NO sky, NO space, NO stars. "
            "Just raw planetary surface material as if a satellite camera is pointing straight down. "
            "Examples of good textures: swirling gas clouds like Jupiter, cracked ice like Europa, "
            "red desert dunes like Mars, molten lava rivers, crystalline mineral deposits, "
            "bioluminescent organic patterns, metallic city grids from above, dense canopy forests from space. "
            "The reader's genre preferences determine the surface type:\n"
            "- gothic/horror → dark obsidian with glowing magma veins\n"
            "- romance → soft pink and coral organic swirls\n"
            "- sci-fi → metallic circuitry patterns with neon traces\n"
            "- literature → earthy layered sediment with golden veins\n"
            "- dystopian → rusted industrial patchwork with smog haze\n"
            "- philosophy → geometric crystal lattice structures\n"
            "Mix genres = mix textures. Personality traits affect color palette and chaos level. "
            "Return ONLY the prompt. Under 80 words."
        )},
        {"role": "user", "content": (
            f"Reader: {name}\n"
            f"Genre preferences: {json.dumps(genres)}\n"
            f"Planet style hint: {planet_style}\n"
            f"{profile_desc}\n"
            "Generate a seamless planet surface texture prompt."
        )},
    ], temperature=0.9)

    return result.strip()


async def generate_planet_image(user_id: str, profile: dict | None = None) -> str | None:
    """Generate a planet image for a user and save to DB."""
    user = db.users.find_one({"_id": user_id})
    if not user:
        return None

    prompt = await build_planet_prompt(user, profile)
    styled = f"Seamless alien planet surface texture, satellite top-down view, fills entire image edge to edge, no sky no horizon no space, photorealistic: {prompt}"

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
        styled = f"Seamless alien planet surface texture, satellite top-down view, fills entire image edge to edge, no sky no horizon no space, photorealistic: {prompt}"
        image = await generate_image(styled, token)
        if image:
            db.users.update_one({"_id": uid}, {"$set": {"generatedPlanetImage": image}})
        results.append({"userId": uid, "name": user.get("name", uid), "success": image is not None})

    return results
