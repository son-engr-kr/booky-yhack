from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import db
from app.db_utils import clean as _clean

router = APIRouter()
COL = "choices"


class ChoiceSubmit(BaseModel):
    optionId: str


@router.get("/{book_id}")
def get_book_choices(book_id: str) -> list:
    return [_clean(d) for d in db[COL].find({"bookId": book_id})]


@router.get("/{book_id}/{choice_id}")
def get_choice(book_id: str, choice_id: str) -> dict:
    doc = db[COL].find_one({"_id": choice_id})
    if not doc or doc.get("bookId") != book_id:
        raise HTTPException(status_code=404, detail=f"Choice '{choice_id}' not found for book '{book_id}'")
    return _clean(doc)


@router.post("/{book_id}/{choice_id}")
def submit_choice(book_id: str, choice_id: str, body: ChoiceSubmit) -> dict:
    doc = db[COL].find_one({"_id": choice_id})
    if not doc or doc.get("bookId") != book_id:
        raise HTTPException(status_code=404, detail=f"Choice '{choice_id}' not found for book '{book_id}'")
    option = next((o for o in doc["options"] if o["id"] == body.optionId), None)
    if option is None:
        raise HTTPException(status_code=400, detail=f"Option '{body.optionId}' is not valid")
    db[COL].update_one({"_id": choice_id}, {"$set": {"myChoice": body.optionId}})
    return {
        "success": True,
        "bookId": book_id,
        "choiceId": choice_id,
        "selectedOption": body.optionId,
        "tendency": option.get("tendency"),
    }
