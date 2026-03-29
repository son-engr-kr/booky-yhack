from fastapi import APIRouter
import json
import math
from pathlib import Path
from typing import Any

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def _load(filename: str) -> Any:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


@router.get("/me")
def get_my_planet() -> dict:
    users = _load("users.json")
    progress = _load("reading-progress.json")
    me = next(u for u in users if u["id"] == "me")
    books = _load("books.json")
    book_titles = {b["id"]: b["title"] for b in books}
    satellites = [
        {**p, "bookTitle": book_titles.get(p["bookId"], p["bookId"])}
        for p in progress
        if p["userId"] == "me" and p.get("status") != "not-started"
    ]
    return {**me, "satellites": satellites}


@router.get("/friends")
def get_friend_planets() -> list:
    users = _load("users.json")
    feed = _load("feed.json")
    feed_sorted = sorted(feed, key=lambda p: p["createdAt"], reverse=True)

    friends = [u for u in users if u["id"] != "me"]
    result = []

    for i, friend in enumerate(friends):
        similarity = friend.get("similarity", 50)
        distance = 100 - similarity

        # Spread in a sphere using golden angle
        angle_h = i * 2.399
        angle_v = math.acos(1 - 2 * (i + 0.5) / len(friends))

        x = round(distance * math.sin(angle_v) * math.cos(angle_h), 2)
        y = round(distance * math.sin(angle_v) * math.sin(angle_h), 2)
        z = round(distance * math.cos(angle_v), 2)

        latest = next((p for p in feed_sorted if p["userId"] == friend["id"]), None)
        latest_feed = latest.get("text") if latest else None

        result.append({**friend, "position": {"x": x, "y": y, "z": z}, "latestFeed": latest_feed})

    return result


@router.get("/constellation/{book_id}")
def get_constellation(book_id: str) -> dict:
    users = _load("users.json")
    progress = _load("reading-progress.json")

    readers_progress = [p for p in progress if p["bookId"] == book_id]
    user_map = {u["id"]: u for u in users}

    readers = []
    count = max(len(readers_progress), 1)
    for i, rp in enumerate(readers_progress):
        uid = rp["userId"]
        user = user_map.get(uid, {})
        similarity = user.get("similarity", 50) if uid != "me" else 100

        distance = (100 - similarity) * 0.8
        angle = i * (2 * math.pi / count)
        x = round(distance * math.cos(angle), 2)
        y = round(distance * math.sin(angle), 2)

        readers.append({
            "userId": uid,
            "userName": user.get("name", uid),
            "currentChapter": rp["currentChapter"],
            "percentage": rp["percentage"],
            "status": rp["status"],
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
