from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
from datetime import datetime, timezone
from pathlib import Path
from app.database import db
from app.services import k2

router = APIRouter()
COL = "reading_notes"
DATA_DIR = Path(__file__).parent.parent / "data"


def _load_books() -> list:
    return json.loads((DATA_DIR / "books.json").read_text(encoding="utf-8"))


from app.db_utils import clean as _clean


def _parse_k2_json(raw: str) -> dict:
    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(clean)


def _get_highlights(book_id: str):
    all_hl = [_clean(d) for d in db.highlights.find({"bookId": book_id})]
    my_hl = [h for h in all_hl if h.get("userId") == "me"]
    friend_hl = [h for h in all_hl if h.get("userId") != "me"]
    return my_hl, friend_hl


def _save_notes(book_id: str, book: dict, notes: dict, think_data: dict | None = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    doc_id = f"me_{book_id}"
    existing = db[COL].find_one({"_id": doc_id})
    history = []
    if existing:
        old_current = existing.get("current")
        old_history = existing.get("history", [])
        if old_current:
            history = old_history + [{"notes": old_current, "generatedAt": existing.get("updatedAt")}]
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
    if think_data:
        doc_data["think_summary"] = think_data.get("think_summary", "")
        doc_data["journey_steps"] = think_data.get("journey_steps", [])

    db[COL].replace_one({"_id": doc_id}, {"_id": doc_id, **doc_data}, upsert=True)
    return doc_data


@router.get("/")
def list_my_reading_notes() -> dict:
    notes = [_clean(d) for d in db[COL].find({"userId": "me"})]
    noted_book_ids = {n["bookId"] for n in notes}

    highlight_book_ids = set()
    for d in db.highlights.find({"userId": "me"}):
        highlight_book_ids.add(d.get("bookId"))

    generatable_ids = highlight_book_ids - noted_book_ids
    books = _load_books()
    generatable = [b for b in books if b["id"] in generatable_ids]

    return {"notes": notes, "generatable": generatable}


@router.get("/{book_id}")
def get_book_reading_notes(book_id: str) -> dict:
    doc = db[COL].find_one({"_id": f"me_{book_id}"})
    if not doc:
        raise HTTPException(status_code=404, detail="No reading notes for this book")
    return _clean(doc)


@router.post("/{book_id}/generate")
async def generate_reading_notes(book_id: str) -> dict:
    books = _load_books()
    book = next((b for b in books if b["id"] == book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found")

    my_hl, friend_hl = _get_highlights(book_id)
    if not my_hl:
        raise HTTPException(status_code=400, detail="No highlights found — highlight some passages first")

    result = await k2.generate_reading_notes_with_think(book["title"], book["author"], my_hl, friend_hl)
    try:
        notes = _parse_k2_json(result["answer"])
    except (json.JSONDecodeError, IndexError):
        raise HTTPException(status_code=500, detail="K2 returned invalid JSON")

    think_data = {
        "think_summary": notes.get("think_summary", ""),
        "journey_steps": result.get("journey_steps", []),
    }
    return _save_notes(book_id, book, notes, think_data)


@router.post("/{book_id}/generate-stream")
async def generate_reading_notes_stream(book_id: str):
    """SSE endpoint: streams think tokens live, then final notes."""
    books = _load_books()
    book = next((b for b in books if b["id"] == book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found")

    my_hl, friend_hl = _get_highlights(book_id)
    if not my_hl:
        raise HTTPException(status_code=400, detail="No highlights found — highlight some passages first")

    async def event_stream():
        async for chunk in k2.stream_reading_notes(book["title"], book["author"], my_hl, friend_hl):
            ctype = chunk.get("type", "")
            if ctype in ("think", "think_done", "answer"):
                yield f"data: {json.dumps(chunk)}\n\n"
            elif ctype == "done":
                # Parse and save
                try:
                    notes = _parse_k2_json(chunk["answer"])
                    think_data = {
                        "think_summary": notes.get("think_summary", ""),
                        "journey_steps": chunk.get("journey_steps", []),
                    }
                    saved = _save_notes(book_id, book, notes, think_data)
                    yield f"data: {json.dumps({'type': 'done', 'data': saved})}\n\n"
                except (json.JSONDecodeError, IndexError):
                    yield f"data: {json.dumps({'type': 'error', 'message': 'K2 returned invalid JSON'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
