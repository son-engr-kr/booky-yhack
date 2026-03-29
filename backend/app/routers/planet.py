from fastapi import APIRouter
from pydantic import BaseModel
import math
import json
from pathlib import Path
from app.database import db
from app.db_utils import clean as _clean

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def _load_books() -> dict:
    books = json.loads((DATA_DIR / "books.json").read_text(encoding="utf-8"))
    return {b["id"]: b["title"] for b in books}


@router.get("/me")
def get_my_planet() -> dict:
    me = _clean(db.users.find_one({"_id": "me"}))
    book_titles = _load_books()
    progress = [_clean(d) for d in db.reading_progress.find({"userId": "me"})]
    satellites = [
        {**p, "bookTitle": book_titles.get(p.get("bookId", ""), p.get("bookId", ""))}
        for p in progress
        if p.get("status") != "not-started"
    ]
    return {**me, "satellites": satellites}


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
