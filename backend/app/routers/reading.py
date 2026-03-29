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


@router.get("/")
def get_my_reading_progress() -> list:
    docs = db.collection(COL).where("userId", "==", "me").stream()
    return [d.to_dict() for d in docs]


@router.get("/{book_id}")
def get_progress_for_book(book_id: str) -> dict:
    doc = db.collection(COL).document(_doc_id("me", book_id)).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"No reading progress found for book '{book_id}'")
    return doc.to_dict()


@router.post("/{book_id}/progress")
def update_progress(book_id: str, body: ProgressUpdate) -> dict:
    doc_id = _doc_id("me", book_id)
    ref = db.collection(COL).document(doc_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"No reading progress found for book '{book_id}'")
    data = doc.to_dict()
    total = data.get("totalChapters", 0)
    status = "completed" if body.currentChapter >= total else "reading"
    ref.update({
        "currentChapter": body.currentChapter,
        "percentage": body.percentage,
        "status": status,
    })
    return {**data, "currentChapter": body.currentChapter, "percentage": body.percentage, "status": status}
