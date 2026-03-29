"""Regenerate highlights using actual text from chapters.json."""
import json
import random
import uuid
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

random.seed(42)
client = MongoClient("mongodb://localhost:27017")
db = client["booky"]

chapters = json.load(open("app/data/chapters.json", encoding="utf-8"))

USERS = {
    "me": "Hunjun Shin",
    "friend-alex": "Alex Kim",
    "friend-mina": "Mina Park",
    "friend-jake": "Jake Lee",
    "friend-sofia": "Sofia Chen",
    "friend-ryan": "Ryan Oh",
}
ALL_UIDS = list(USERS.keys())

COMMENTS = [
    "This line hits different every time I read it.",
    "One of the most powerful passages in the whole book.",
    "The writing here is absolutely incredible.",
    "I highlighted this on my first read and it still moves me.",
    "This says so much about the character's inner world.",
    "The irony here is devastating.",
    "I keep coming back to this quote.",
    "This moment changed the entire story for me.",
    "The symbolism here is masterful.",
    "Goosebumps every single time.",
    "Such a subtle but powerful observation.",
    "I had to stop reading after this line and just think.",
    "The precision of this language is stunning.",
    "This moment defines the whole novel for me.",
    "Perfectly captures the mood of the whole chapter.",
]

REPLIES = [
    "Totally agree! This was my favorite part too.",
    "I interpreted this completely differently — interesting perspective.",
    "Yes! I was just about to highlight the same thing.",
    "Great catch. I missed this on my first read.",
    "This connects to what happens later in a really interesting way.",
    "The way you read this is making me reconsider my own take.",
    "Couldn't agree more. Such a well-crafted moment.",
    "I actually had the opposite reaction — but I see your point.",
    "This is why I love reading with friends. Different perspectives!",
    "That's a really thoughtful observation.",
    "I had the exact same thought while reading this chapter!",
    "You always notice the things I miss!",
    "So true. The author really knew what they were doing here.",
    "This gives me chills every time.",
    "Really makes you think about the bigger picture.",
]


def extract_sentences(text, min_len=35, max_len=130):
    """Extract clean sentences from chapter text."""
    raw = text.replace("\n", " ").replace("  ", " ")
    parts = []
    for s in raw.split("."):
        s = s.strip()
        if min_len < len(s) < max_len and not s.startswith('"') and not s.startswith("—"):
            parts.append(s)
    return parts


def get_user_max_chapter(uid, book_id):
    prog = db.reading_progress.find_one({"_id": f"{uid}_{book_id}"})
    if not prog:
        return 0
    return prog.get("currentChapter", 0)


def main():
    db.highlights.delete_many({})
    total = 0
    total_replies = 0

    for book_id, book_chapters in chapters.items():
        # Collect sentences per chapter
        ch_sentences = {}
        for ch_str, ch_data in book_chapters.items():
            text = ch_data.get("text", "")
            sents = extract_sentences(text)
            if sents:
                ch_sentences[int(ch_str)] = sents

        if not ch_sentences:
            continue

        # For each user, create highlights within their read chapters
        for uid, uname in USERS.items():
            max_ch = get_user_max_chapter(uid, book_id)
            if max_ch == 0:
                continue

            available = []
            for ch_num, sents in ch_sentences.items():
                if ch_num <= max_ch:
                    for s in sents:
                        available.append((ch_num, s))

            if not available:
                continue

            num_highlights = random.randint(2, min(5, len(available)))
            picks = random.sample(available, num_highlights)

            for ch_num, sentence in picks:
                hl_id = str(uuid.uuid4())
                others = [u for u in ALL_UIDS if u != uid]

                # Generate 0-3 replies
                replies = []
                for _ in range(random.randint(0, 3)):
                    replier = random.choice(others)
                    replies.append({
                        "id": str(uuid.uuid4()),
                        "userId": replier,
                        "userName": USERS[replier],
                        "text": random.choice(REPLIES),
                        "createdAt": (datetime.now(timezone.utc) - timedelta(
                            days=random.randint(0, 7),
                            hours=random.randint(0, 23)
                        )).isoformat(),
                    })

                db.highlights.insert_one({
                    "_id": hl_id,
                    "bookId": book_id,
                    "chapterNum": ch_num,
                    "userId": uid,
                    "userName": uname,
                    "text": sentence,
                    "comment": random.choice(COMMENTS),
                    "color": random.choice(["#f59e0b", "#6366f1", "#ec4899", "#10b981"]),
                    "likes": random.randint(0, 5),
                    "likers": random.sample(others, random.randint(0, min(3, len(others)))),
                    "replies": replies,
                    "createdAt": (datetime.now(timezone.utc) - timedelta(
                        days=random.randint(1, 20),
                        hours=random.randint(0, 23)
                    )).isoformat(),
                })
                total += 1
                total_replies += len(replies)

    print(f"Inserted {total} highlights with {total_replies} replies.")
    for uid, uname in USERS.items():
        count = db.highlights.count_documents({"userId": uid})
        print(f"  {uname}: {count} highlights")


if __name__ == "__main__":
    main()
