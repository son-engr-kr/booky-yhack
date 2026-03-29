from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.database import db

router = APIRouter()
FEED = "feed"
USERS = "users"
PROGRESS = "reading_progress"


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
    posts = [d.to_dict() for d in db.collection(FEED).stream()]
    users = {d.id: d.to_dict() for d in db.collection(USERS).stream()}
    my_progress = {
        d.to_dict()["bookId"]: d.to_dict()
        for d in db.collection(PROGRESS).where("userId", "==", "me").stream()
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

    return sorted(posts, key=lambda p: p["createdAt"], reverse=True)


@router.get("/spoiler-check")
def spoiler_check(book_id: str, chapter: int) -> dict:
    doc = db.collection(PROGRESS).document(f"me_{book_id}").get()
    if not doc.exists:
        return {"bookId": book_id, "chapter": chapter, "isSpoiler": True, "reason": "not_started"}
    my_entry = doc.to_dict()
    is_spoiler = chapter > my_entry["currentChapter"]
    return {
        "bookId": book_id,
        "chapter": chapter,
        "myChapter": my_entry["currentChapter"],
        "isSpoiler": is_spoiler,
    }


@router.post("/story")
def create_story(body: StoryPost) -> dict:
    return {"success": True, "type": "story", "userId": "me", "bookId": body.bookId, "chapter": body.chapter, "text": body.text}


@router.post("/highlight")
def create_highlight_post(body: HighlightPost) -> dict:
    return {"success": True, "type": "highlight", "userId": "me", "bookId": body.bookId, "chapter": body.chapter, "text": body.text, "note": body.note, "color": body.color}
