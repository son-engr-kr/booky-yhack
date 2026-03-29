from fastapi import APIRouter
import json
from pathlib import Path
from typing import Any

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def load_json(filename: str) -> Any:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


@router.get("/")
def get_current_user() -> dict:
    """Return the currently authenticated user (always 'me')."""
    users = load_json("users.json")
    me = next((u for u in users if u["id"] == "me"), None)
    return me


@router.get("/users")
def get_all_users() -> list:
    """Return all users in the system."""
    return load_json("users.json")
