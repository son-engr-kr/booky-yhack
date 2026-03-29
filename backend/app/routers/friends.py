from fastapi import APIRouter, HTTPException
from app.database import db

router = APIRouter()
USERS = "users"
PROGRESS = "reading_progress"


@router.get("/")
def list_friends() -> list:
    docs = db.collection(USERS).stream()
    return [d.to_dict() for d in docs if d.id != "me"]


@router.get("/{user_id}")
def get_friend(user_id: str) -> dict:
    if user_id == "me":
        raise HTTPException(status_code=404, detail=f"Friend '{user_id}' not found")
    doc = db.collection(USERS).document(user_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Friend '{user_id}' not found")
    return doc.to_dict()


@router.get("/{user_id}/progress")
def get_friend_progress(user_id: str) -> list:
    if user_id == "me":
        raise HTTPException(status_code=404, detail=f"Friend '{user_id}' not found")
    user_doc = db.collection(USERS).document(user_id).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail=f"Friend '{user_id}' not found")
    docs = db.collection(PROGRESS).where("userId", "==", user_id).stream()
    return [d.to_dict() for d in docs]
