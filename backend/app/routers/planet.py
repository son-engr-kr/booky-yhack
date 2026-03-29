from fastapi import APIRouter
import math
import json
from pathlib import Path
from app.database import db

router = APIRouter()
USERS = "users"
PROGRESS = "reading_progress"
FEED = "feed"
DATA_DIR = Path(__file__).parent.parent / "data"


def _load_books() -> dict:
    with open(DATA_DIR / "books.json", encoding="utf-8") as f:
        books = json.load(f)
    return {b["id"]: b["title"] for b in books}


@router.get("/me")
def get_my_planet() -> dict:
    me = db.collection(USERS).document("me").get().to_dict()
    book_titles = _load_books()
    progress_docs = db.collection(PROGRESS).where("userId", "==", "me").stream()
    satellites = [
        {**p.to_dict(), "bookTitle": book_titles.get(p.to_dict()["bookId"], p.to_dict()["bookId"])}
        for p in progress_docs
        if p.to_dict().get("status") != "not-started"
    ]
    return {**me, "satellites": satellites}


@router.get("/friends")
def get_friend_planets() -> list:
    friends = [d.to_dict() for d in db.collection(USERS).stream() if d.id != "me"]
    feed_docs = sorted(
        [d.to_dict() for d in db.collection(FEED).stream()],
        key=lambda p: p["createdAt"],
        reverse=True,
    )

    result = []
    for i, friend in enumerate(friends):
        similarity = friend.get("similarity", 50)
        distance = 100 - similarity

        angle_h = i * 2.399
        angle_v = math.acos(1 - 2 * (i + 0.5) / len(friends))

        x = round(distance * math.sin(angle_v) * math.cos(angle_h), 2)
        y = round(distance * math.sin(angle_v) * math.sin(angle_h), 2)
        z = round(distance * math.cos(angle_v), 2)

        latest = next((p for p in feed_docs if p["userId"] == friend["id"]), None)
        latest_feed = latest.get("text") if latest else None

        result.append({**friend, "position": {"x": x, "y": y, "z": z}, "latestFeed": latest_feed})

    return result


@router.get("/constellation/{book_id}")
def get_constellation(book_id: str) -> dict:
    user_map = {d.id: d.to_dict() for d in db.collection(USERS).stream()}
    readers_progress = [
        d.to_dict() for d in db.collection(PROGRESS).where("bookId", "==", book_id).stream()
    ]

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
