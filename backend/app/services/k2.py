"""K2 Think V2 API client — OpenAI-compatible chat completions."""
import re
import json as _json
from typing import AsyncIterator
import httpx
from app.config import settings


def _extract_final_answer(text: str) -> str:
    """Strip K2 reasoning traces, return only the final answer."""
    if "</think>" in text:
        return text.split("</think>", 1)[1].strip()
    for marker in ["\n\nAnswer:", "\n\nResponse:", "\n\n---\n"]:
        if marker in text:
            return text.split(marker, 1)[1].strip()
    return text.strip()


def _extract_think_and_answer(text: str) -> dict:
    """Return both the think block and the final answer."""
    think = ""
    answer = text.strip()
    if "</think>" in text:
        parts = text.split("</think>", 1)
        think_raw = parts[0]
        # Strip opening <think> tag
        think = re.sub(r"^<think>\s*", "", think_raw).strip()
        answer = parts[1].strip()
    return {"think": think, "answer": answer}


def _parse_journey_steps(think: str) -> list[dict]:
    """Extract key reasoning steps from a think block as a journey timeline."""
    if not think:
        return []
    steps = []
    # Split into sentences/chunks and pick meaningful ones
    sentences = re.split(r'(?<=[.!?])\s+', think)
    keywords = {
        "discover": "discovery",
        "found": "discovery",
        "notice": "observation",
        "compar": "comparison",
        "similar": "comparison",
        "differ": "contrast",
        "tension": "contrast",
        "unique": "insight",
        "interest": "insight",
        "style": "analysis",
        "lens": "analysis",
        "pattern": "pattern",
        "theme": "pattern",
        "synthe": "synthesis",
        "overall": "synthesis",
        "conclu": "synthesis",
    }
    for s in sentences:
        s = s.strip()
        if len(s) < 20:
            continue
        step_type = "thinking"
        lower = s.lower()
        for kw, stype in keywords.items():
            if kw in lower:
                step_type = stype
                break
        steps.append({"text": s, "type": step_type})
        if len(steps) >= 8:
            break
    return steps


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


async def chat_with_think(messages: list[dict], temperature: float = 0.7) -> dict:
    """Like chat(), but returns {think, answer, journey_steps}."""
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
        result = _extract_think_and_answer(raw)
        result["journey_steps"] = _parse_journey_steps(result["think"])
        return result


async def chat_stream(messages: list[dict], temperature: float = 0.7) -> AsyncIterator[dict]:
    """Stream K2 response, yielding {type, content} dicts.

    Yields:
      {"type": "think", "content": "chunk"} during <think> block
      {"type": "answer", "content": "chunk"} after </think>
      {"type": "done", "think": "full", "answer": "full"} at end
    """
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            settings.k2_api_url,
            headers={
                "Authorization": f"Bearer {settings.k2_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.k2_model,
                "messages": messages,
                "stream": True,
                "temperature": temperature,
            },
        ) as resp:
            resp.raise_for_status()
            full_text = ""
            in_think = False
            think_done = False

            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                payload = line[6:]
                if payload.strip() == "[DONE]":
                    break
                chunk_data = _json.loads(payload)
                delta = chunk_data.get("choices", [{}])[0].get("delta", {})
                token = delta.get("content", "")
                if not token:
                    continue

                full_text += token

                # Detect <think> boundaries
                if "<think>" in full_text and not in_think and not think_done:
                    in_think = True
                if "</think>" in full_text and in_think:
                    in_think = False
                    think_done = True
                    yield {"type": "think_done", "content": ""}
                    continue

                if in_think:
                    # Strip the <think> tag from first token
                    clean = token.replace("<think>", "")
                    if clean:
                        yield {"type": "think", "content": clean}
                elif think_done:
                    yield {"type": "answer", "content": token}

            result = _extract_think_and_answer(full_text)
            result["journey_steps"] = _parse_journey_steps(result["think"])
            yield {"type": "done", **result}


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


def _build_reading_notes_messages(
    book_title: str, author: str, my_highlights: list[dict], friend_highlights: list[dict]
) -> list[dict]:
    """Build the messages for reading notes generation — 3-part structure."""
    my_hl_text = "\n".join(
        f'- "{h["text"]}" — my note: {h.get("comment") or "(no note)"}'
        for h in my_highlights
    ) or "(no highlights yet)"

    friend_hl_text = "\n".join(
        f'- "{h["text"]}" — {h.get("userName", "Friend")}: {h.get("comment") or "(no note)"}'
        for h in friend_highlights
    ) or "(no friend highlights)"

    return [
        {"role": "system", "content": (
            "You are a literary analysis assistant for a social reading app. "
            "Generate a clean, concise reading report with exactly 3 sections. "
            "Respond with ONLY valid JSON:\n"
            "{\n"
            '  "my_summary": "A cohesive 3-5 sentence paragraph summarizing MY reading experience — '
            'what themes I gravitated toward, what my highlights reveal about how I read this book, '
            'my overall perspective and emotional response.",\n'
            '  "friends_summary": "A cohesive 3-5 sentence paragraph summarizing FRIENDS\' collective reading — '
            'what patterns emerge across all friends, how the group as a whole approached the book differently from me, '
            'key contrasts and surprising agreements. Do NOT list individual friends — synthesize into one narrative.",\n'
            '  "synthesis": "2-3 sentences tying it all together — the key tension or insight that emerges '
            'when comparing my reading with my friends\'."'
            "\n}"
        )},
        {"role": "user", "content": (
            f"Book: {book_title} by {author}\n\n"
            f"MY highlights and notes:\n{my_hl_text}\n\n"
            f"FRIENDS' highlights and notes:\n{friend_hl_text}\n\n"
            "Generate the 3-part reading report JSON."
        )},
    ]


async def generate_reading_notes(
    book_title: str,
    author: str,
    my_highlights: list[dict],
    friend_highlights: list[dict],
) -> str:
    """Compare reader's highlights with friends' — returns answer only."""
    messages = _build_reading_notes_messages(book_title, author, my_highlights, friend_highlights)
    return await chat(messages, temperature=0.5)


async def generate_reading_notes_with_think(
    book_title: str,
    author: str,
    my_highlights: list[dict],
    friend_highlights: list[dict],
) -> dict:
    """Compare reader's highlights — returns {think, answer, journey_steps}."""
    messages = _build_reading_notes_messages(book_title, author, my_highlights, friend_highlights)
    return await chat_with_think(messages, temperature=0.5)


async def stream_reading_notes(
    book_title: str,
    author: str,
    my_highlights: list[dict],
    friend_highlights: list[dict],
) -> AsyncIterator[dict]:
    """Stream reading notes generation — yields think/answer/done chunks."""
    messages = _build_reading_notes_messages(book_title, author, my_highlights, friend_highlights)
    async for chunk in chat_stream(messages, temperature=0.5):
        yield chunk


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
