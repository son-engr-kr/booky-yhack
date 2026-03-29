from fastapi import APIRouter
from pydantic import BaseModel
import json
from pathlib import Path
from typing import Any, Optional

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def load_json(filename: str) -> Any:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


class StoryPost(BaseModel):
    bookId: str
    chapter: int
    text: str


class HighlightPost(BaseModel):
    bookId: str
    chapter: int
    text: str
    note: Optional[str] = None
    color: str = "yellow"


@router.get("/")
def get_feed() -> list:
    """Return all feed posts sorted by createdAt descending, with dynamic spoiler detection."""
    posts = load_json("feed.json")
    users = {u["id"]: u for u in load_json("users.json")}
    progress = load_json("reading-progress.json")
    my_progress = {p["bookId"]: p for p in progress if p["userId"] == "me"}

    for post in posts:
        user = users.get(post.get("userId"), {})
        post["planetImage"] = user.get("planetImage", "planet2.png")
        # Dynamic spoiler detection based on user's reading progress
        book_prog = my_progress.get(post.get("bookId"))
        post_chapter = post.get("chapterNum", 0)
        if book_prog is None:
            post["isSpoiler"] = True if post_chapter > 0 else False
        elif post_chapter > book_prog.get("currentChapter", 0):
            post["isSpoiler"] = True
        # Keep existing isSpoiler=True if already set by content analysis

    return sorted(posts, key=lambda p: p["createdAt"], reverse=True)


@router.get("/spoiler-check")
def spoiler_check(book_id: str, chapter: int) -> dict:
    """Check if a feed post at the given chapter is a spoiler for the current user's progress."""
    progress = load_json("reading-progress.json")
    my_entry = next(
        (p for p in progress if p["userId"] == "me" and p["bookId"] == book_id),
        None,
    )
    if my_entry is None:
        return {"bookId": book_id, "chapter": chapter, "isSpoiler": True, "reason": "not_started"}
    is_spoiler = chapter > my_entry["currentChapter"]
    return {
        "bookId": book_id,
        "chapter": chapter,
        "myChapter": my_entry["currentChapter"],
        "isSpoiler": is_spoiler,
    }


@router.post("/story")
def create_story(body: StoryPost) -> dict:
    """Create a new story post for the current user (mock)."""
    return {
        "success": True,
        "type": "story",
        "userId": "me",
        "bookId": body.bookId,
        "chapter": body.chapter,
        "text": body.text,
    }


@router.post("/highlight")
def create_highlight_post(body: HighlightPost) -> dict:
    """Create a new highlight post for the current user (mock)."""
    return {
        "success": True,
        "type": "highlight",
        "userId": "me",
        "bookId": body.bookId,
        "chapter": body.chapter,
        "text": body.text,
        "note": body.note,
        "color": body.color,
    }
