from fastapi import APIRouter, HTTPException
from app.database import db

router = APIRouter()


from app.db_utils import clean as _clean


@router.get("/")
def list_friends() -> list:
    return [_clean(d) for d in db.users.find({"id": {"$ne": "me"}})]


@router.get("/{user_id}")
def get_friend(user_id: str) -> dict:
    if user_id == "me":
        raise HTTPException(status_code=404, detail=f"Friend '{user_id}' not found")
    doc = db.users.find_one({"_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Friend '{user_id}' not found")
    return _clean(doc)


@router.get("/{user_id}/progress")
def get_friend_progress(user_id: str) -> list:
    if user_id == "me":
        raise HTTPException(status_code=404, detail=f"Friend '{user_id}' not found")
    user = db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail=f"Friend '{user_id}' not found")
    return [_clean(d) for d in db.reading_progress.find({"userId": user_id})]
