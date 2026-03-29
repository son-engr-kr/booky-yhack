"""Generate and cache character descriptions per book+chapter in Firestore."""
import json
from pathlib import Path
from app.services import k2
from app.database import db

COL = "character_cache"


def _doc_id(book_id: str, chapter: int) -> str:
    return f"{book_id}_ch{chapter}"


def get_cached(book_id: str, chapter: int) -> list[dict] | None:
    doc = db.collection(COL).document(_doc_id(book_id, chapter)).get()
    if doc.exists:
        return doc.to_dict().get("characters")
    return None


def save_cache(book_id: str, chapter: int, characters: list[dict]):
    db.collection(COL).document(_doc_id(book_id, chapter)).set({
        "bookId": book_id,
        "chapter": chapter,
        "characters": characters,
    })


async def generate_characters(book_id: str, book_title: str, author: str, chapter: int) -> list[dict]:
    """Generate character info from chapters 1..chapter using K2, with Firestore caching."""
    cached = get_cached(book_id, chapter)
    if cached:
        return cached

    prev_context = ""
    if chapter > 1:
        prev = get_cached(book_id, chapter - 1)
        if prev:
            prev_context = f"\nPrevious character info (up to ch.{chapter-1}):\n{json.dumps(prev, ensure_ascii=False)}\n"

    chapters_file = Path(__file__).parent.parent / "data" / "chapters.json"
    chapter_texts = ""
    if chapters_file.exists():
        with open(chapters_file, encoding="utf-8") as f:
            all_chapters = json.load(f)
        book_chapters = all_chapters.get(book_id, {})
        for ch_num in range(1, chapter + 1):
            ch = book_chapters.get(str(ch_num))
            if ch:
                text = ch.get("text", "")[:1000]
                chapter_texts += f"\n--- Chapter {ch_num}: {ch.get('title', '')} ---\n{text}\n"

    result = await k2.chat([
        {"role": "system", "content": (
            "You analyze book chapters and extract character information. "
            "Based ONLY on what has been revealed up to the given chapter (NO spoilers from later chapters), "
            "generate a JSON array of characters. Each character object:\n"
            '{"id": "slug-name", "name": "Full Name", "role": "brief role (2-3 words)", '
            '"description": "1-2 sentences about the character based ONLY on chapters read so far", '
            '"chapters": [list of chapter numbers where they appear]}\n'
            "Include only characters who have appeared. Order by importance."
        )},
        {"role": "user", "content": (
            f"Book: {book_title} by {author}\n"
            f"Chapters read: 1 through {chapter}\n"
            f"{prev_context}"
            f"\nChapter excerpts:\n{chapter_texts}\n\n"
            "Generate the character list as a JSON array."
        )},
    ], temperature=0.3)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        characters = json.loads(clean)
        save_cache(book_id, chapter, characters)
        return characters
    except (json.JSONDecodeError, IndexError):
        return []
