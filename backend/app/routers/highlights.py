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


@router.get("/{book_id}")
def get_my_highlights(book_id: str) -> list:
    docs = db.collection(COL).where("userId", "==", "me").where("bookId", "==", book_id).stream()
    return [d.to_dict() for d in docs]


@router.get("/{book_id}/friends")
def get_friend_highlights(book_id: str, chapter: Optional[int] = None) -> list:
    docs = db.collection(COL).where("bookId", "==", book_id).stream()
    results = [d.to_dict() for d in docs if d.to_dict().get("userId") != "me"]
    if chapter is not None:
        results = [h for h in results if h.get("chapterNum", 0) <= chapter]
    return results


@router.post("/{book_id}")
def create_highlight(book_id: str, body: HighlightCreate) -> dict:
    new_hl = {
        "id": str(uuid.uuid4()),
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
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    db.collection(COL).document(new_hl["id"]).set(new_hl)
    return new_hl


@router.delete("/{book_id}/{highlight_id}")
def delete_highlight(book_id: str, highlight_id: str) -> dict:
    ref = db.collection(COL).document(highlight_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Highlight not found")
    if doc.to_dict().get("userId") != "me":
        raise HTTPException(status_code=403, detail="Not your highlight")
    ref.delete()
    return {"ok": True}


@router.post("/{book_id}/{highlight_id}/like")
def toggle_like(book_id: str, highlight_id: str) -> dict:
    ref = db.collection(COL).document(highlight_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Highlight not found")
    hl = doc.to_dict()
    likers: list = hl.get("likers", [])
    if "me" in likers:
        likers.remove("me")
        liked = False
    else:
        likers.append("me")
        liked = True
    likes = len(likers)
    ref.update({"likers": likers, "likes": likes})
    return {"likes": likes, "liked": liked}


@router.post("/{book_id}/{highlight_id}/reply")
def add_reply(book_id: str, highlight_id: str, body: ReplyCreate) -> dict:
    ref = db.collection(COL).document(highlight_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Highlight not found")
    hl = doc.to_dict()
    reply = {
        "id": str(uuid.uuid4()),
        "userId": "me",
        "userName": "Hunjun",
        "text": body.text,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    replies = hl.get("replies", [])
    replies.append(reply)
    ref.update({"replies": replies})
    return reply
