"""K2 Think V2 API client — OpenAI-compatible chat completions."""
import httpx
from app.config import settings


def _extract_final_answer(text: str) -> str:
    """Strip K2 reasoning traces, return only the final answer."""
    # K2 Think V2 uses <think>...</think> blocks for reasoning
    if "</think>" in text:
        return text.split("</think>", 1)[1].strip()
    # Fallback: look for other markers
    for marker in ["\n\nAnswer:", "\n\nResponse:", "\n\n---\n"]:
        if marker in text:
            return text.split(marker, 1)[1].strip()
    return text.strip()


async def chat(messages: list[dict], stream: bool = False, temperature: float = 0.7) -> str:
    """Send chat completion request to K2 Think V2."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            settings.k2_api_url,
            headers={
                "Authorization": f"Bearer {settings.k2_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.k2_model,
                "messages": messages,
                "stream": False,
                "temperature": temperature,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        raw = data["choices"][0]["message"]["content"]
        return _extract_final_answer(raw)


async def generate_questions(book_title: str, author: str, chapter_title: str, passage: str) -> str:
    """Generate thought-provoking reading questions for a passage."""
    return await chat([
        {"role": "system", "content": (
            "You are an AI MC (Master of Ceremony) for a social reading app. "
            "Your job is to ask thought-provoking questions that make readers think deeply "
            "about the text and share their inner thoughts. "
            "Generate 2-3 questions. Each question should be personal — "
            "asking what the READER thinks/feels, not trivia about the text. "
            "Format: Return only the questions, one per line, no numbering."
        )},
        {"role": "user", "content": (
            f"Book: {book_title} by {author}\n"
            f"Chapter: {chapter_title}\n"
            f"Passage:\n{passage}\n\n"
            "Generate thought-provoking questions for the reader."
        )},
    ])


async def author_chat(book_title: str, author: str, user_message: str, history: list[dict] = None) -> str:
    """Chat with an AI author persona."""
    system = (
        f"You are {author}, the author of '{book_title}'. "
        f"Respond in character as {author} would — using their voice, perspective, "
        "historical context, and literary philosophy. You have deep knowledge of your work "
        "and the era you lived in. Be thoughtful, literary, and occasionally provocative. "
        "Keep responses concise (2-4 sentences) unless asked to elaborate."
    )
    messages = [{"role": "system", "content": system}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    return await chat(messages, temperature=0.8)


async def generate_choice(book_title: str, author: str, chapter_num: int, context: str) -> str:
    """Generate a Detroit-style choice question at a key moment."""
    return await chat([
        {"role": "system", "content": (
            "You are designing interactive choice moments for a reading app, "
            "inspired by Detroit: Become Human style branching decisions. "
            "Given a key moment in a book, create ONE compelling moral/ethical dilemma "
            "that puts the reader in a character's shoes. "
            "Format your response as JSON:\n"
            '{"question": "...", "context": "brief situation setup", '
            '"options": [{"id": "a", "text": "short label", "description": "1 sentence"}, '
            '{"id": "b", "text": "short label", "description": "1 sentence"}]}'
        )},
        {"role": "user", "content": (
            f"Book: {book_title} by {author}\n"
            f"Chapter {chapter_num}\n"
            f"Context: {context}\n\n"
            "Create a choice moment."
        )},
    ], temperature=0.8)


async def generate_recap(book_title: str, author: str, chapters_summary: str) -> str:
    """Generate a 6-panel visual recap of previous chapters."""
    return await chat([
        {"role": "system", "content": (
            "You generate 6-panel story recaps for a reading app. "
            "Each panel should be a key moment from the story so far. "
            "Format as JSON array of 6 objects:\n"
            '[{"panel": 1, "emoji": "relevant emoji", "title": "2-3 words", '
            '"description": "1 sentence summary of the moment"}]'
        )},
        {"role": "user", "content": (
            f"Book: {book_title} by {author}\n"
            f"Story so far:\n{chapters_summary}\n\n"
            "Create a 6-panel recap."
        )},
    ])


async def check_spoiler(user_text: str, book_title: str, reader_chapter: int) -> str:
    """Check if a post contains spoilers beyond the reader's current chapter."""
    return await chat([
        {"role": "system", "content": (
            "You are a spoiler detection system. Analyze the given text and determine "
            "if it reveals plot points, character fates, or key twists from chapters "
            "AFTER the reader's current position. "
            "Respond with JSON: {\"is_spoiler\": true/false, \"reason\": \"brief explanation\"}"
        )},
        {"role": "user", "content": (
            f"Book: {book_title}\n"
            f"Reader is at: Chapter {reader_chapter}\n"
            f"Text to check: {user_text}"
        )},
    ], temperature=0.2)
