from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import db
from app.db_utils import clean as _clean

router = APIRouter()
COL = "choices"
USER_CHOICES = "user_choices"


class ChoiceSubmit(BaseModel):
    optionId: str
    comment: str = ""


@router.get("/{book_id}")
def get_book_choices(book_id: str) -> list:
    choices = [_clean(d) for d in db[COL].find({"bookId": book_id})]
    # Attach myChoice from user_choices
    for c in choices:
        uc = db[USER_CHOICES].find_one({"userId": "me", "choiceId": c["id"]})
        if uc:
            c["myChoice"] = uc.get("optionId", "")
    return choices


@router.get("/{book_id}/{choice_id}")
def get_choice(book_id: str, choice_id: str) -> dict:
    doc = db[COL].find_one({"_id": choice_id})
    if not doc or doc.get("bookId") != book_id:
        raise HTTPException(status_code=404, detail=f"Choice '{choice_id}' not found")
    result = _clean(doc)
    uc = db[USER_CHOICES].find_one({"userId": "me", "choiceId": choice_id})
    if uc:
        result["myChoice"] = uc.get("optionId", "")
    return result


@router.post("/{book_id}/{choice_id}")
def submit_choice(book_id: str, choice_id: str, body: ChoiceSubmit) -> dict:
    doc = db[COL].find_one({"_id": choice_id})
    if not doc or doc.get("bookId") != book_id:
        raise HTTPException(status_code=404, detail=f"Choice '{choice_id}' not found")
    option = next((o for o in doc["options"] if o["id"] == body.optionId), None)
    if option is None:
        raise HTTPException(status_code=400, detail=f"Option '{body.optionId}' is not valid")

    # Upsert user choice
    uc_id = f"me_{choice_id}"
    existing = db[USER_CHOICES].find_one({"_id": uc_id})
    old_option = existing.get("optionId") if existing else None

    db[USER_CHOICES].replace_one({"_id": uc_id}, {
        "_id": uc_id,
        "userId": "me",
        "userName": "Hunjun Shin",
        "choiceId": choice_id,
        "bookId": book_id,
        "chapterNum": doc.get("chapterNum", 0),
        "optionId": body.optionId,
        "comment": body.comment,
    }, upsert=True)

    # Rebuild stats from all user_choices
    all_votes = list(db[USER_CHOICES].find({"choiceId": choice_id}))
    total = len(all_votes)
    stats = {}
    for opt in doc["options"]:
        oid = opt["id"]
        voters = [{"userId": v["userId"], "userName": v.get("userName", ""), "optionId": oid, "comment": v.get("comment", "")} for v in all_votes if v["optionId"] == oid]
        count = len(voters)
        stats[oid] = {"percentage": round(count / total * 100) if total > 0 else 0, "count": count, "voters": voters}

    db[COL].update_one({"_id": choice_id}, {"$set": {"stats": stats, "totalVotes": total}})

    return {
        "success": True,
        "bookId": book_id,
        "choiceId": choice_id,
        "selectedOption": body.optionId,
        "stats": stats,
        "totalVotes": total,
    }
