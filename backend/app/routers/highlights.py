from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def load_json(filename: str) -> Any:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def save_json(filename: str, data: Any) -> None:
    with open(DATA_DIR / filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class HighlightCreate(BaseModel):
    chapter: int
    text: str
    note: Optional[str] = None
    color: str = "#f59e0b"


class ReplyCreate(BaseModel):
    text: str


@router.get("/{book_id}")
def get_my_highlights(book_id: str) -> list:
    """Return all highlights created by the current user for a specific book."""
    highlights = load_json("highlights.json")
    return [h for h in highlights if h["userId"] == "me" and h["bookId"] == book_id]


@router.get("/{book_id}/friends")
def get_friend_highlights(book_id: str, chapter: Optional[int] = None) -> list:
    """Return highlights from friends for a book, optionally filtered by chapter number."""
    highlights = load_json("highlights.json")
    results = [h for h in highlights if h["userId"] != "me" and h["bookId"] == book_id]
    if chapter is not None:
        results = [h for h in results if h["chapterNum"] <= chapter]
    return results


@router.post("/{book_id}")
def create_highlight(book_id: str, body: HighlightCreate) -> dict:
    """Create a new highlight and persist to JSON."""
    highlights = load_json("highlights.json")
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
        "replies": [],
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    highlights.append(new_hl)
    save_json("highlights.json", highlights)
    return new_hl


@router.delete("/{book_id}/{highlight_id}")
def delete_highlight(book_id: str, highlight_id: str) -> dict:
    """Delete a highlight owned by the current user."""
    highlights = load_json("highlights.json")
    hl = next((h for h in highlights if h["id"] == highlight_id), None)
    if hl is None:
        raise HTTPException(status_code=404, detail="Highlight not found")
    if hl["userId"] != "me":
        raise HTTPException(status_code=403, detail="Not your highlight")
    highlights = [h for h in highlights if h["id"] != highlight_id]
    save_json("highlights.json", highlights)
    return {"ok": True}


@router.post("/{book_id}/{highlight_id}/like")
def toggle_like(book_id: str, highlight_id: str) -> dict:
    """Toggle like on a highlight. Returns new like count and liked state."""
    highlights = load_json("highlights.json")
    hl = next((h for h in highlights if h["id"] == highlight_id), None)
    if hl is None:
        raise HTTPException(status_code=404, detail="Highlight not found")
    likers = hl.setdefault("likers", [])
    if "me" in likers:
        likers.remove("me")
        liked = False
    else:
        likers.append("me")
        liked = True
    hl["likes"] = len(likers)
    save_json("highlights.json", highlights)
    return {"likes": hl["likes"], "liked": liked}


@router.post("/{book_id}/{highlight_id}/reply")
def add_reply(book_id: str, highlight_id: str, body: ReplyCreate) -> dict:
    """Add a reply/comment to a highlight."""
    highlights = load_json("highlights.json")
    hl = next((h for h in highlights if h["id"] == highlight_id), None)
    if hl is None:
        raise HTTPException(status_code=404, detail="Highlight not found")
    reply = {
        "id": str(uuid.uuid4()),
        "userId": "me",
        "userName": "Hunjun",
        "text": body.text,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    hl.setdefault("replies", []).append(reply)
    save_json("highlights.json", highlights)
    return reply
