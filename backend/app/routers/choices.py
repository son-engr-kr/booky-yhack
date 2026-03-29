from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from pathlib import Path
from typing import Any

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def _load(filename: str) -> Any:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def _save(filename: str, data: Any) -> None:
    with open(DATA_DIR / filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


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
    choices = _load("choices.json")
    book_choices = [c for c in choices if c["bookId"] == book_id]
    if not book_choices:
        raise HTTPException(status_code=404, detail=f"No choices found for book '{book_id}'")
    return book_choices


@router.get("/{book_id}/{choice_id}")
def get_choice(book_id: str, choice_id: str) -> dict:
    choices = _load("choices.json")
    choice = next(
        (c for c in choices if c["bookId"] == book_id and c["id"] == choice_id),
        None,
    )
    if choice is None:
        raise HTTPException(status_code=404, detail=f"Choice '{choice_id}' not found for book '{book_id}'")
    return choice


@router.post("/{book_id}/{choice_id}")
def submit_choice(book_id: str, choice_id: str, body: ChoiceSubmit) -> dict:
    choices = _load("choices.json")
    choice = next(
        (c for c in choices if c["bookId"] == book_id and c["id"] == choice_id),
        None,
    )
    if choice is None:
        raise HTTPException(status_code=404, detail=f"Choice '{choice_id}' not found for book '{book_id}'")
    option = next((o for o in choice["options"] if o["id"] == body.optionId), None)
    if option is None:
        raise HTTPException(status_code=400, detail=f"Option '{body.optionId}' is not valid")
    # Persist the choice
    choice["myChoice"] = body.optionId
    _save("choices.json", choices)
    return {
        "success": True,
        "bookId": book_id,
        "choiceId": choice_id,
        "selectedOption": body.optionId,
        "tendency": option.get("tendency"),
    }
