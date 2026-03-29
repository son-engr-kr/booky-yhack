from fastapi import APIRouter
from pydantic import BaseModel
import math
import json
from pathlib import Path
from app.database import db
from app.db_utils import clean as _clean
from app.services import planet_image_service

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def _load_books() -> dict:
    books = json.loads((DATA_DIR / "books.json").read_text(encoding="utf-8"))
    return {b["id"]: b["title"] for b in books}


def _get_reading_profile(user_id: str = "me") -> dict:
    """Build reading profile for a user. Currently hardcoded, will be dynamic later."""
    profiles = {
        "me": {
            "spectrum": [
                {"label": "Moral Compass", "left": "Idealist", "right": "Realist", "value": 72},
                {"label": "Action Style", "left": "Cautious", "right": "Bold", "value": 65},
                {"label": "Trust", "left": "Skeptic", "right": "Trusting", "value": 40},
            ],
            "radar": {"Empathy": 85, "Logic": 60, "Adventure": 45, "Caution": 70, "Optimism": 75},
            "tendencies": [
                {"text": "You tend to forgive. 78% of the time you chose mercy over justice.", "percentage": 78},
                {"text": "You lean toward hope even when the odds are against it.", "percentage": 71},
                {"text": "You prefer observing before acting.", "percentage": 65},
            ],
            "friendComparison": [
                {"friendId": "friend-alex", "friendName": "Alex Kim", "matchPercentage": 91},
                {"friendId": "friend-mina", "friendName": "Mina Park", "matchPercentage": 45},
                {"friendId": "friend-jake", "friendName": "Jake Lee", "matchPercentage": 78},
                {"friendId": "friend-sofia", "friendName": "Sofia Chen", "matchPercentage": 62},
            ],
        },
        "friend-alex": {
            "spectrum": [
                {"label": "Moral Compass", "left": "Idealist", "right": "Realist", "value": 35},
                {"label": "Action Style", "left": "Cautious", "right": "Bold", "value": 82},
                {"label": "Trust", "left": "Skeptic", "right": "Trusting", "value": 55},
            ],
            "radar": {"Empathy": 55, "Logic": 90, "Adventure": 80, "Caution": 30, "Optimism": 60},
            "tendencies": [],
            "friendComparison": [],
        },
        "friend-mina": {
            "spectrum": [
                {"label": "Moral Compass", "left": "Idealist", "right": "Realist", "value": 80},
                {"label": "Action Style", "left": "Cautious", "right": "Bold", "value": 40},
                {"label": "Trust", "left": "Skeptic", "right": "Trusting", "value": 75},
            ],
            "radar": {"Empathy": 92, "Logic": 45, "Adventure": 35, "Caution": 85, "Optimism": 88},
            "tendencies": [],
            "friendComparison": [],
        },
    }
    return profiles.get(user_id, {"spectrum": [], "radar": {}, "tendencies": [], "friendComparison": []})


@router.get("/me")
async def get_my_planet() -> dict:
    me = _clean(db.users.find_one({"_id": "me"}))
    book_titles = _load_books()
    progress = [_clean(d) for d in db.reading_progress.find({"userId": "me"})]
    satellites = [
        {**p, "bookTitle": book_titles.get(p.get("bookId", ""), p.get("bookId", ""))}
        for p in progress
        if p.get("status") != "not-started"
    ]

    profile = _get_reading_profile("me")

    # Auto-generate planet image if never generated
    if not me.get("generatedPlanetImage"):
        try:
            image = await planet_image_service.generate_planet_image("me", profile)
            if image:
                me["generatedPlanetImage"] = image
        except Exception:
            pass

    return {**me, **profile, "satellites": satellites}


class PlanetUpdate(BaseModel):
    name: str


@router.patch("/me")
def update_my_planet(body: PlanetUpdate) -> dict:
    name = body.name.strip()
    db.users.update_one({"_id": "me"}, {"$set": {"name": name}})
    return {"name": name}


@router.get("/friends")
def get_friend_planets() -> list:
    friends = [_clean(d) for d in db.users.find({"_id": {"$ne": "me"}})]
    feed_docs = sorted(
        [_clean(d) for d in db.feed.find()],
        key=lambda p: p.get("createdAt", ""),
        reverse=True,
    )

    result = []
    for i, friend in enumerate(friends):
        similarity = friend.get("similarity", 50)
        distance = 100 - similarity

        angle_h = i * 2.399
        angle_v = math.acos(1 - 2 * (i + 0.5) / max(len(friends), 1))

        x = round(distance * math.sin(angle_v) * math.cos(angle_h), 2)
        y = round(distance * math.sin(angle_v) * math.sin(angle_h), 2)
        z = round(distance * math.cos(angle_v), 2)

        latest = next((p for p in feed_docs if p.get("userId") == friend.get("id")), None)
        latest_feed = latest.get("text") if latest else None

        result.append({**friend, "position": {"x": x, "y": y, "z": z}, "latestFeed": latest_feed})

    return result


@router.get("/constellation/{book_id}")
def get_constellation(book_id: str) -> dict:
    user_map = {}
    for d in db.users.find():
        uid = d["_id"]
        user_map[uid] = _clean(d)
    readers_progress = [_clean(d) for d in db.reading_progress.find({"bookId": book_id})]

    readers = []
    count = max(len(readers_progress), 1)
    for i, rp in enumerate(readers_progress):
        uid = rp.get("userId", "")
        user = user_map.get(uid, {})
        similarity = user.get("similarity", 50) if uid != "me" else 100

        distance = (100 - similarity) * 0.8
        angle = i * (2 * math.pi / count)
        x = round(distance * math.cos(angle), 2)
        y = round(distance * math.sin(angle), 2)

        readers.append({
            "userId": uid,
            "userName": user.get("name", uid),
            "currentChapter": rp.get("currentChapter", 0),
            "percentage": rp.get("percentage", 0),
            "status": rp.get("status", ""),
            "similarity": similarity,
            "position": {"x": x, "y": y},
        })

    connections = []
    for i in range(len(readers)):
        for j in range(i + 1, len(readers)):
            a = readers[i]
            b = readers[j]
            strength = round((a["similarity"] + b["similarity"]) / 200, 2)
            connections.append({"from": a["userId"], "to": b["userId"], "strength": strength})

    return {"bookId": book_id, "readers": readers, "connections": connections}


@router.post("/me/generate-image")
async def generate_my_planet_image() -> dict:
    """Generate a unique planet image based on reading profile."""
    profile = _get_reading_profile("me")
    image = await planet_image_service.generate_planet_image("me", profile)
    if not image:
        return {"success": False, "error": "Failed to generate image"}
    return {"success": True, "image": image}


@router.post("/generate-all-images")
async def generate_all_planet_images() -> dict:
    """Debug: generate planet images for ALL users."""
    users = list(db.users.find())
    results = []
    for user in users:
        uid = user["_id"]
        profile = _get_reading_profile(uid)
        image = await planet_image_service.generate_planet_image(uid, profile)
        results.append({"userId": uid, "name": user.get("name", uid), "success": image is not None})
    return {"results": results}
