from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from pathlib import Path
from typing import Any, Optional

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def load_json(filename: str) -> Any:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


class HighlightCreate(BaseModel):
    chapter: int
    text: str
    note: Optional[str] = None
    color: str = "yellow"


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
    """Create a new highlight for the current user on a specific book (mock)."""
    return {
        "success": True,
        "id": "new-highlight-id",
        "userId": "me",
        "bookId": book_id,
        "chapter": body.chapter,
        "text": body.text,
        "note": body.note,
        "color": body.color,
    }
