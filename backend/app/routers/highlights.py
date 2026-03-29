from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone
from typing import Optional
from app.database import db

router = APIRouter()
COL = "highlights"


class HighlightCreate(BaseModel):
    chapter: int
    text: str
    note: Optional[str] = None
    color: str = "#f59e0b"


class ReplyCreate(BaseModel):
    text: str


from app.db_utils import clean as _clean


@router.get("/{book_id}")
def get_my_highlights(book_id: str) -> list:
    return [_clean(d) for d in db[COL].find({"userId": "me", "bookId": book_id})]


@router.get("/{book_id}/friends")
def get_friend_highlights(book_id: str, chapter: Optional[int] = None) -> list:
    query = {"bookId": book_id, "userId": {"$ne": "me"}}
    if chapter is not None:
        query["chapterNum"] = {"$lte": chapter}
    return [_clean(d) for d in db[COL].find(query)]


@router.post("/{book_id}")
def create_highlight(book_id: str, body: HighlightCreate) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    hl_id = str(uuid.uuid4())
    new_hl = {
        "id": hl_id,
        "bookId": book_id,
        "chapterNum": body.chapter,
        "userId": "me",
        "userName": "Hunjun",
        "text": body.text,
        "comment": body.note or "",
        "color": body.color,
        "likes": 0,
        "likers": [],
        "replies": [],
        "createdAt": now,
    }
    db[COL].insert_one({"_id": hl_id, **new_hl})
    return new_hl


@router.delete("/{book_id}/{highlight_id}")
def delete_highlight(book_id: str, highlight_id: str) -> dict:
    doc = db[COL].find_one({"_id": highlight_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Highlight not found")
    if doc.get("userId") != "me":
        raise HTTPException(status_code=403, detail="Not your highlight")
    db[COL].delete_one({"_id": highlight_id})
    return {"ok": True}


@router.post("/{book_id}/{highlight_id}/like")
def toggle_like(book_id: str, highlight_id: str) -> dict:
    doc = db[COL].find_one({"_id": highlight_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Highlight not found")
    likers: list = doc.get("likers", [])
    if "me" in likers:
        likers.remove("me")
        liked = False
    else:
        likers.append("me")
        liked = True
    likes = len(likers)
    db[COL].update_one({"_id": highlight_id}, {"$set": {"likers": likers, "likes": likes}})
    return {"likes": likes, "liked": liked}


@router.post("/{book_id}/{highlight_id}/reply")
def add_reply(book_id: str, highlight_id: str, body: ReplyCreate) -> dict:
    doc = db[COL].find_one({"_id": highlight_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Highlight not found")
    reply = {
        "id": str(uuid.uuid4()),
        "userId": "me",
        "userName": "Hunjun",
        "text": body.text,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    db[COL].update_one({"_id": highlight_id}, {"$push": {"replies": reply}})
    return reply


@router.delete("/{book_id}/{highlight_id}/reply/{reply_id}")
def delete_reply(book_id: str, highlight_id: str, reply_id: str) -> dict:
    result = db[COL].update_one(
        {"_id": highlight_id},
        {"$pull": {"replies": {"id": reply_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reply not found")
    return {"ok": True}
