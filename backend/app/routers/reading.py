from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import db

router = APIRouter()
COL = "reading_progress"


class ProgressUpdate(BaseModel):
    currentChapter: int
    percentage: float


def _doc_id(user_id: str, book_id: str) -> str:
    return f"{user_id}_{book_id}"


from app.db_utils import clean as _clean


@router.get("/")
def get_my_reading_progress() -> list:
    return [_clean(d) for d in db[COL].find({"userId": "me"})]


@router.get("/{book_id}")
def get_progress_for_book(book_id: str) -> dict:
    doc = db[COL].find_one({"_id": _doc_id("me", book_id)})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No reading progress found for book '{book_id}'")
    return _clean(doc)


@router.post("/{book_id}/progress")
def update_progress(book_id: str, body: ProgressUpdate) -> dict:
    doc_id = _doc_id("me", book_id)
    doc = db[COL].find_one({"_id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No reading progress found for book '{book_id}'")
    total = doc.get("totalChapters", 0)
    status = "completed" if body.currentChapter >= total else "reading"
    db[COL].update_one({"_id": doc_id}, {"$set": {
        "currentChapter": body.currentChapter,
        "percentage": body.percentage,
        "status": status,
    }})
    return {**_clean(doc), "currentChapter": body.currentChapter, "percentage": body.percentage, "status": status}
