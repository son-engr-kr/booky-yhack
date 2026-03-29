from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import db

router = APIRouter()
COL = "choices"


class ChoiceSubmit(BaseModel):
    optionId: str


@router.get("/profile")
def get_reading_profile() -> dict:
    return {
        "spectrum": [
            {"label": "Moral Compass", "left": "Idealist", "right": "Realist", "value": 72},
            {"label": "Action Style", "left": "Cautious", "right": "Bold", "value": 65},
            {"label": "Trust", "left": "Skeptic", "right": "Trusting", "value": 40},
        ],
        "radar": {"Empathy": 85, "Logic": 60, "Adventure": 45, "Caution": 70, "Optimism": 75},
        "tendencies": [
            {"text": "You tend to forgive. 78% of the time you chose mercy over justice.", "percentage": 78},
            {"text": "You lean toward hope even when the odds are against it.", "percentage": 71},
            {"text": "You prefer observing before acting.", "percentage": 65},
        ],
        "friendComparison": [
            {"friendId": "friend-alex", "friendName": "Alex Kim", "matchPercentage": 91},
            {"friendId": "friend-mina", "friendName": "Mina Park", "matchPercentage": 45},
            {"friendId": "friend-jake", "friendName": "Jake Lee", "matchPercentage": 78},
            {"friendId": "friend-sofia", "friendName": "Sofia Chen", "matchPercentage": 62},
        ],
    }


@router.get("/{book_id}")
def get_book_choices(book_id: str) -> list:
    docs = db.collection(COL).where("bookId", "==", book_id).stream()
    choices = [d.to_dict() for d in docs]
    if not choices:
        raise HTTPException(status_code=404, detail=f"No choices found for book '{book_id}'")
    return choices


@router.get("/{book_id}/{choice_id}")
def get_choice(book_id: str, choice_id: str) -> dict:
    doc = db.collection(COL).document(choice_id).get()
    if not doc.exists or doc.to_dict().get("bookId") != book_id:
        raise HTTPException(status_code=404, detail=f"Choice '{choice_id}' not found for book '{book_id}'")
    return doc.to_dict()


@router.post("/{book_id}/{choice_id}")
def submit_choice(book_id: str, choice_id: str, body: ChoiceSubmit) -> dict:
    ref = db.collection(COL).document(choice_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("bookId") != book_id:
        raise HTTPException(status_code=404, detail=f"Choice '{choice_id}' not found for book '{book_id}'")
    choice = doc.to_dict()
    option = next((o for o in choice["options"] if o["id"] == body.optionId), None)
    if option is None:
        raise HTTPException(status_code=400, detail=f"Option '{body.optionId}' is not valid")
    ref.update({"myChoice": body.optionId})
    return {
        "success": True,
        "bookId": book_id,
        "choiceId": choice_id,
        "selectedOption": body.optionId,
        "tendency": option.get("tendency"),
    }
