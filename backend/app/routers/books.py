from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
import json
from pathlib import Path
from typing import Any
from app.services import character_service

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"

# Fallback hardcoded characters (used when K2 is unavailable)
BOOK_CHARACTERS: dict[str, list[dict]] = {
    "great-gatsby": [
        {"id": "nick-carraway", "name": "Nick Carraway", "role": "narrator", "description": "A Yale-educated Midwesterner who moves to West Egg and becomes entangled in Gatsby's world.", "chapters": [1, 2, 3, 4, 5, 6, 7, 8, 9]},
        {"id": "jay-gatsby", "name": "Jay Gatsby", "role": "mysterious millionaire", "description": "A self-made millionaire who throws lavish parties in pursuit of his lost love Daisy.", "chapters": [1, 3, 4, 5, 6, 7, 8, 9]},
        {"id": "daisy-buchanan", "name": "Daisy Buchanan", "role": "Nick's cousin", "description": "A beautiful and careless socialite who was Gatsby's obsession and Tom's wife.", "chapters": [1, 4, 5, 6, 7, 8, 9]},
        {"id": "tom-buchanan", "name": "Tom Buchanan", "role": "Daisy's husband", "description": "An arrogant and wealthy former athlete who dismisses Gatsby as a social inferior.", "chapters": [1, 2, 6, 7, 8, 9]},
        {"id": "jordan-baker", "name": "Jordan Baker", "role": "golfer", "description": "A professional golfer and Nick's love interest who is known for her cool dishonesty.", "chapters": [1, 3, 4, 5, 6, 7, 9]},
        {"id": "myrtle-wilson", "name": "Myrtle Wilson", "role": "Tom's affair", "description": "Tom's lower-class mistress who dreams of escaping her dull life in the Valley of Ashes.", "chapters": [2, 7]},
    ],
    "1984": [
        {"id": "winston-smith", "name": "Winston Smith", "role": "protagonist", "description": "A low-ranking Party member who secretly harbors rebellious thoughts against Big Brother's regime.", "chapters": [1, 2, 3, 4, 5, 6, 7, 8]},
        {"id": "julia", "name": "Julia", "role": "love interest", "description": "A fellow Party member who engages in a forbidden love affair with Winston as an act of rebellion.", "chapters": [2, 3, 4, 5, 6, 7]},
        {"id": "obrien", "name": "O'Brien", "role": "Inner Party", "description": "A high-ranking Inner Party official who appears sympathetic to Winston but is ultimately his tormentor.", "chapters": [1, 5, 6, 7, 8]},
        {"id": "big-brother", "name": "Big Brother", "role": "leader", "description": "The omnipresent figurehead of the Party whose face appears on posters throughout Oceania.", "chapters": [1, 2, 3, 4, 5, 6, 7, 8]},
        {"id": "parsons", "name": "Parsons", "role": "neighbor", "description": "Winston's cheerful and blindly loyal neighbor who is eventually turned in by his own daughter.", "chapters": [1, 2, 7]},
        {"id": "syme", "name": "Syme", "role": "Newspeak specialist", "description": "A brilliant philologist working on the Newspeak dictionary who is later vaporized by the Party.", "chapters": [1, 2, 5]},
    ],
    "pride-prejudice": [
        {"id": "elizabeth-bennet", "name": "Elizabeth Bennet", "role": "protagonist", "description": "The witty and independent second Bennet daughter who judges others by first impressions before learning humility.", "chapters": [1, 2, 3, 4, 5, 6, 7, 8]},
        {"id": "mr-darcy", "name": "Mr. Darcy", "role": "love interest", "description": "A wealthy and proud gentleman whose initial arrogance conceals a deeply honorable character.", "chapters": [2, 3, 4, 5, 6, 7, 8]},
        {"id": "jane-bennet", "name": "Jane Bennet", "role": "elder sister", "description": "Elizabeth's gentle and beautiful elder sister who falls in love with Mr. Bingley.", "chapters": [1, 2, 3, 4, 5, 6, 7, 8]},
        {"id": "mr-bingley", "name": "Mr. Bingley", "role": "Darcy's friend", "description": "An amiable and wealthy young man who rents Netherfield and falls for Jane Bennet.", "chapters": [1, 2, 3, 5, 6, 7, 8]},
        {"id": "mr-wickham", "name": "Mr. Wickham", "role": "officer", "description": "A charming militia officer whose handsome facade hides a scheming and dishonest nature.", "chapters": [3, 4, 5, 6, 7, 8]},
        {"id": "lady-catherine", "name": "Lady Catherine", "role": "Darcy's aunt", "description": "An imperious aristocrat who considers herself the arbiter of propriety and opposes Elizabeth's match with Darcy.", "chapters": [6, 7, 8]},
    ],
}


def _load(filename: str) -> Any:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


@router.get("/")
def list_books() -> list:
    return _load("books.json")


@router.get("/{book_id}/chapters/{chapter_num}")
def get_chapter(book_id: str, chapter_num: int) -> dict:
    chapters = _load("chapters.json")
    book_chapters = chapters.get(book_id)
    if book_chapters is None:
        raise HTTPException(status_code=404, detail=f"No chapters found for book '{book_id}'")
    chapter = book_chapters.get(str(chapter_num))
    if chapter is None:
        raise HTTPException(status_code=404, detail=f"Chapter {chapter_num} not found for book '{book_id}'")
    return chapter


@router.get("/{book_id}/characters")
async def get_characters(book_id: str, chapter: int = Query(default=0)) -> dict:
    books = _load("books.json")
    book = next((b for b in books if b["id"] == book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found")

    # If chapter specified, use K2-generated characters (with cache)
    if chapter > 0:
        characters = await character_service.generate_characters(
            book_id, book["title"], book["author"], chapter
        )
        if characters:
            return {"bookId": book_id, "characters": characters}

    # Fallback to hardcoded
    characters = BOOK_CHARACTERS.get(book_id, [])
    return {"bookId": book_id, "characters": characters}


@router.get("/{book_id}")
def get_book(book_id: str) -> dict:
    books = _load("books.json")
    book = next((b for b in books if b["id"] == book_id), None)
    if book is None:
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found")
    return book
