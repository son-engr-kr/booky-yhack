from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from pathlib import Path
from typing import Any

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def load_json(filename: str) -> Any:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


class ProgressUpdate(BaseModel):
    currentChapter: int
    percentage: float


@router.get("/")
def get_my_reading_progress() -> list:
    """Return all reading progress entries for the current user ('me')."""
    progress = load_json("reading-progress.json")
    return [p for p in progress if p["userId"] == "me"]


@router.get("/{book_id}")
def get_progress_for_book(book_id: str) -> dict:
    """Return reading progress for the current user on a specific book."""
    progress = load_json("reading-progress.json")
    entry = next((p for p in progress if p["userId"] == "me" and p["bookId"] == book_id), None)
    if entry is None:
        raise HTTPException(
            status_code=404,
            detail=f"No reading progress found for book '{book_id}'",
        )
    return entry


@router.post("/{book_id}/progress")
def update_progress(book_id: str, body: ProgressUpdate) -> dict:
    """Update reading progress for the current user on a specific book."""
    return {
        "success": True,
        "userId": "me",
        "bookId": book_id,
        "currentChapter": body.currentChapter,
        "percentage": body.percentage,
    }
