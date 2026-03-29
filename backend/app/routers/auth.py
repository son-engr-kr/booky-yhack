from fastapi import APIRouter
from app.database import db

router = APIRouter()
COL = "users"


@router.get("/")
def get_current_user() -> dict:
    doc = db.collection(COL).document("me").get()
    return doc.to_dict() if doc.exists else {}


@router.get("/users")
def get_all_users() -> list:
    docs = db.collection(COL).stream()
    return [d.to_dict() for d in docs]
