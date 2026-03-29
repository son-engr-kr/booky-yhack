from fastapi import APIRouter, HTTPException
import json
from pathlib import Path
from typing import Any

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def load_json(filename: str) -> Any:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


@router.get("/")
def list_friends() -> list:
    """Return all users except 'me', including their similarity score."""
    users = load_json("users.json")
    return [u for u in users if u["id"] != "me"]


@router.get("/{user_id}")
def get_friend(user_id: str) -> dict:
    """Return detailed profile for a specific friend."""
    users = load_json("users.json")
    user = next((u for u in users if u["id"] == user_id and user_id != "me"), None)
    if user is None:
        raise HTTPException(status_code=404, detail=f"Friend '{user_id}' not found")
    return user


@router.get("/{user_id}/progress")
def get_friend_progress(user_id: str) -> list:
    """Return all reading progress entries for a specific friend."""
    users = load_json("users.json")
    if not any(u["id"] == user_id and user_id != "me" for u in users):
        raise HTTPException(status_code=404, detail=f"Friend '{user_id}' not found")
    progress = load_json("reading-progress.json")
    return [p for p in progress if p["userId"] == user_id]
