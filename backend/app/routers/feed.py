from fastapi import APIRouter
from pydantic import BaseModel
import json
from pathlib import Path
from typing import Optional
from app.database import db

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def _book_titles() -> dict:
    books = json.loads((DATA_DIR / "books.json").read_text(encoding="utf-8"))
    return {b["id"]: b["title"] for b in books}


from app.db_utils import clean as _clean


class StoryPost(BaseModel):
    bookId: str
    chapter: int
    text: str


@router.get("/")
def get_feed() -> list:
    posts = [_clean(d) for d in db.feed.find()]

    book_titles = _book_titles()
    for d in db.highlights.find():
        hl = _clean(d)
        posts.append({
            "id": hl["id"],
            "type": "highlight",
            "userId": hl.get("userId", ""),
            "userName": hl.get("userName", ""),
            "bookId": hl.get("bookId", ""),
            "bookTitle": book_titles.get(hl.get("bookId", ""), hl.get("bookId", "")),
            "chapterNum": hl.get("chapterNum", 0),
            "text": hl.get("comment", ""),
            "quote": hl.get("text", ""),
            "likes": hl.get("likes", 0),
            "comments": hl.get("replies", []),
            "createdAt": hl.get("createdAt", ""),
            "isSpoiler": False,
        })

    users = {d["id"]: _clean(d) for d in db.users.find()}
    my_progress = {
        d["bookId"]: _clean(d)
        for d in db.reading_progress.find({"userId": "me"})
    }

    for post in posts:
        user = users.get(post.get("userId"), {})
        post["planetImage"] = user.get("planetImage", "planet2.png")
        book_prog = my_progress.get(post.get("bookId"))
        post_chapter = post.get("chapterNum", 0)
        if book_prog is None:
            post["isSpoiler"] = post_chapter > 0
        elif post_chapter > book_prog.get("currentChapter", 0):
            post["isSpoiler"] = True

    return sorted(posts, key=lambda p: p.get("createdAt", ""), reverse=True)


@router.get("/spoiler-check")
def spoiler_check(book_id: str, chapter: int) -> dict:
    doc = db.reading_progress.find_one({"_id": f"me_{book_id}"})
    if not doc:
        return {"bookId": book_id, "chapter": chapter, "isSpoiler": True, "reason": "not_started"}
    is_spoiler = chapter > doc["currentChapter"]
    return {
        "bookId": book_id,
        "chapter": chapter,
        "myChapter": doc["currentChapter"],
        "isSpoiler": is_spoiler,
    }


class CommentCreate(BaseModel):
    text: str


@router.post("/{post_id}/comment")
def add_comment(post_id: str, body: CommentCreate) -> dict:
    """Add comment to a feed post or highlight."""
    import uuid
    from datetime import datetime, timezone

    comment = {
        "id": str(uuid.uuid4()),
        "userId": "me",
        "userName": "Hunjun",
        "text": body.text,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    # Try feed collection first
    result = db.feed.update_one({"_id": post_id}, {"$push": {"comments": comment}})
    if result.matched_count == 0:
        # Must be a highlight-sourced post — store comment on the highlight
        result = db.highlights.update_one({"_id": post_id}, {"$push": {"replies": comment}})
        if result.matched_count == 0:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Post not found")

    return comment


@router.delete("/{post_id}/comment/{comment_id}")
def delete_comment(post_id: str, comment_id: str) -> dict:
    """Delete a comment from a feed post or highlight."""
    # Try feed collection
    result = db.feed.update_one(
        {"_id": post_id},
        {"$pull": {"comments": {"id": comment_id}}}
    )
    if result.modified_count == 0:
        # Try highlights
        result = db.highlights.update_one(
            {"_id": post_id},
            {"$pull": {"replies": {"id": comment_id}}}
        )
        if result.modified_count == 0:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Comment not found")
    return {"ok": True}


@router.post("/story")
def create_story(body: StoryPost) -> dict:
    return {"success": True, "type": "story", "userId": "me", "bookId": body.bookId, "chapter": body.chapter, "text": body.text}
