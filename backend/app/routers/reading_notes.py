from fastapi import APIRouter, HTTPException
import json
from datetime import datetime, timezone
from pathlib import Path
from app.database import db
from app.services import k2

router = APIRouter()
COL = "reading_notes"
DATA_DIR = Path(__file__).parent.parent / "data"


def _load_books() -> list:
    with open(DATA_DIR / "books.json", encoding="utf-8") as f:
        return json.load(f)


def _parse_k2_json(raw: str) -> dict:
    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(clean)


@router.get("/")
def list_my_reading_notes() -> dict:
    """Return saved notes + books that have highlights but no notes yet."""
    notes_docs = db.collection(COL).where("userId", "==", "me").stream()
    notes = [d.to_dict() for d in notes_docs]
    noted_book_ids = {n["bookId"] for n in notes}

    # Find books with my highlights
    hl_docs = db.collection("highlights").where("userId", "==", "me").stream()
    highlight_book_ids = {d.to_dict()["bookId"] for d in hl_docs}

    generatable_ids = highlight_book_ids - noted_book_ids
    books = _load_books()
    generatable = [b for b in books if b["id"] in generatable_ids]

    return {"notes": notes, "generatable": generatable}


@router.get("/{book_id}")
def get_book_reading_notes(book_id: str) -> dict:
    doc = db.collection(COL).document(f"me_{book_id}").get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="No reading notes for this book")
    return doc.to_dict()


@router.post("/{book_id}/generate")
async def generate_reading_notes(book_id: str) -> dict:
    # Load book info
    books = _load_books()
    book = next((b for b in books if b["id"] == book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found")

    # Fetch highlights from Firestore
    all_hl = [d.to_dict() for d in db.collection("highlights").where("bookId", "==", book_id).stream()]
    my_hl = [h for h in all_hl if h.get("userId") == "me"]
    friend_hl = [h for h in all_hl if h.get("userId") != "me"]

    if not my_hl:
        raise HTTPException(status_code=400, detail="No highlights found — highlight some passages first")

    # Generate via K2
    raw = await k2.generate_reading_notes(book["title"], book["author"], my_hl, friend_hl)
    try:
        notes = _parse_k2_json(raw)
    except (json.JSONDecodeError, IndexError):
        raise HTTPException(status_code=500, detail="K2 returned invalid JSON")

    # Save with history
    now = datetime.now(timezone.utc).isoformat()
    ref = db.collection(COL).document(f"me_{book_id}")
    existing = ref.get()
    history = []
    if existing.exists:
        existing_data = existing.to_dict()
        old_current = existing_data.get("current")
        old_history = existing_data.get("history", [])
        if old_current:
            history = old_history + [{"notes": old_current, "generatedAt": existing_data.get("updatedAt")}]
        else:
            history = old_history

    doc_data = {
        "userId": "me",
        "bookId": book_id,
        "bookTitle": book["title"],
        "author": book["author"],
        "current": notes,
        "history": history,
        "updatedAt": now,
    }
    ref.set(doc_data)
    return doc_data
