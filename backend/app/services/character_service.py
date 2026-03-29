"""Generate and cache character descriptions based on chapters read."""
import json
from pathlib import Path
from app.services import k2

CACHE_DIR = Path(__file__).parent.parent / "data" / "character_cache"
CACHE_DIR.mkdir(exist_ok=True)


def _cache_path(book_id: str, chapter: int) -> Path:
    return CACHE_DIR / f"{book_id}_ch{chapter}.json"


def get_cached(book_id: str, chapter: int) -> list[dict] | None:
    path = _cache_path(book_id, chapter)
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return None


def save_cache(book_id: str, chapter: int, characters: list[dict]):
    with open(_cache_path(book_id, chapter), "w", encoding="utf-8") as f:
        json.dump(characters, f, ensure_ascii=False, indent=2)


async def generate_characters(book_id: str, book_title: str, author: str, chapter: int) -> list[dict]:
    """Generate character info from chapters 1..chapter using K2, with caching."""
    # Check cache first
    cached = get_cached(book_id, chapter)
    if cached:
        return cached

    # Also check if previous chapter cache exists — use it as context
    prev_context = ""
    if chapter > 1:
        prev = get_cached(book_id, chapter - 1)
        if prev:
            prev_context = f"\nPrevious character info (up to ch.{chapter-1}):\n{json.dumps(prev, ensure_ascii=False)}\n"

    # Load chapter texts up to current chapter
    chapters_file = Path(__file__).parent.parent / "data" / "chapters.json"
    chapter_texts = ""
    if chapters_file.exists():
        with open(chapters_file, encoding="utf-8") as f:
            all_chapters = json.load(f)
        book_chapters = all_chapters.get(book_id, {})
        for ch_num in range(1, chapter + 1):
            ch = book_chapters.get(str(ch_num))
            if ch:
                # Use first 1000 chars per chapter to stay within token limits
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
