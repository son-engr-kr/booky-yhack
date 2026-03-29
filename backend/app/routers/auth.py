from fastapi import APIRouter
from app.database import db
from app.db_utils import clean

router = APIRouter()


@router.get("/")
def get_current_user() -> dict:
    return clean(db.users.find_one({"_id": "me"}))


@router.get("/users")
def get_all_users() -> list:
    return [clean(d) for d in db.users.find()]
