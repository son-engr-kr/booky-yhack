from fastapi import APIRouter
from pydantic import BaseModel
from app.services import k2

router = APIRouter()


class QuestionRequest(BaseModel):
    book_title: str
    author: str
    chapter_title: str
    passage: str


class AuthorChatRequest(BaseModel):
    book_title: str
    author: str
    message: str
    history: list[dict] = []


class ChoiceRequest(BaseModel):
    book_title: str
    author: str
    chapter_num: int
    context: str


class RecapRequest(BaseModel):
    book_title: str
    author: str
    chapters_summary: str


class ReadingNotesRequest(BaseModel):
    book_title: str
    author: str
    my_highlights: list[dict]
    friend_highlights: list[dict]


class SpoilerCheckRequest(BaseModel):
    text: str
    book_title: str
    reader_chapter: int


@router.post("/questions")
async def generate_questions(req: QuestionRequest):
    result = await k2.generate_questions(
        req.book_title, req.author, req.chapter_title, req.passage
    )
    questions = [q.strip() for q in result.strip().split("\n") if q.strip()]
    return {"questions": questions}


@router.post("/author-chat")
async def author_chat(req: AuthorChatRequest):
    result = await k2.author_chat(
        req.book_title, req.author, req.message, req.history
    )
    return {"response": result}


@router.post("/choice")
async def generate_choice(req: ChoiceRequest):
    result = await k2.generate_choice(
        req.book_title, req.author, req.chapter_num, req.context
    )
    # Try to parse JSON from response
    import json
    try:
        # Strip markdown code fences if present
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(clean)
    except (json.JSONDecodeError, IndexError):
        return {"raw": result}


@router.post("/recap")
async def generate_recap(req: RecapRequest):
    result = await k2.generate_recap(
        req.book_title, req.author, req.chapters_summary
    )
    import json
    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        panels = json.loads(clean)
        return {"panels": panels}
    except (json.JSONDecodeError, IndexError):
        return {"raw": result}


@router.post("/reading-notes")
async def generate_reading_notes(req: ReadingNotesRequest):
    import json
    result = await k2.generate_reading_notes(
        req.book_title, req.author, req.my_highlights, req.friend_highlights
    )
    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(clean)
    except (json.JSONDecodeError, IndexError):
        return {"raw": result}


@router.post("/spoiler-check")
async def spoiler_check(req: SpoilerCheckRequest):
    result = await k2.check_spoiler(
        req.text, req.book_title, req.reader_chapter
    )
    import json
    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(clean)
    except (json.JSONDecodeError, IndexError):
        return {"is_spoiler": False, "raw": result}
