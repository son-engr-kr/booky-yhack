"""Import cloud Firestore dump into MongoDB, mapping cloud schema to local schema."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["booky"]

DUMP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "firestore_dump")


def load(name):
    with open(os.path.join(DUMP, name), encoding="utf-8") as f:
        return json.load(f)


def import_users():
    """Cloud users → MongoDB users collection."""
    data = load("users.json")
    db.users.delete_many({})
    count = 0
    for uid, doc in data.items():
        user = {
            "_id": uid,
            "id": uid,
            "name": doc.get("displayName", "Unknown"),
            "email": doc.get("email", ""),
            "planetImage": "planet2.png",
            "planetStyle": "rocky",
            "level": 1,
            "booksRead": 0,
            "totalNotes": 0,
            "totalChoices": 0,
            "genres": {},
            "friends": doc.get("friends", []),
        }
        db.users.insert_one(user)
        count += 1
    print(f"  users: {count} docs")


def import_reading_progress():
    """Cloud userBooks → MongoDB reading_progress + extract subcollections."""
    data = load("userBooks.json")
    db.reading_progress.delete_many({})
    db.highlights.delete_many({})
    db.conversations.delete_many({})
    db.reading_notes.delete_many({})

    prog_count = 0
    hl_count = 0
    conv_count = 0
    notes_count = 0

    # Load books for totalChapters
    books_data = load("books.json")
    book_chapters = {bid: b.get("totalChapters", 0) for bid, b in books_data.items()}

    for doc_id, doc in data.items():
        user_id = doc.get("userId", "")
        book_id = doc.get("bookId", "")
        current_ch = doc.get("currentChapter", 0)
        total_ch = book_chapters.get(book_id, doc.get("totalChapters", 0))
        pct = doc.get("percentage", 0)
        status = "completed" if pct >= 100 else ("reading" if current_ch > 0 else "not-started")

        progress = {
            "_id": doc_id,
            "userId": user_id,
            "bookId": book_id,
            "currentChapter": current_ch,
            "totalChapters": total_ch,
            "percentage": pct,
            "status": status,
            "startedAt": doc.get("startedAt", ""),
            "notesCount": 0,
            "questionsAnswered": 0,
        }
        db.reading_progress.insert_one(progress)
        prog_count += 1

        # Extract subcollections
        subs = doc.get("_subcollections", {})

        # Highlights
        for hl_id, hl in subs.get("highlights", {}).items():
            highlight = {
                "_id": hl.get("id", hl_id),
                "bookId": hl.get("bookId", book_id),
                "chapterNum": hl.get("chapter", 0),
                "userId": hl.get("userId", user_id),
                "userName": "",  # Will be enriched later
                "text": hl.get("text", ""),
                "comment": hl.get("comment", ""),
                "color": "#f59e0b",
                "likes": 0,
                "likers": [],
                "replies": [],
                "createdAt": hl.get("createdAt", ""),
                "visibility": hl.get("visibility", "public"),
            }
            db.highlights.insert_one(highlight)
            hl_count += 1

        # Conversations
        for conv_id, conv in subs.get("conversations", {}).items():
            conversation = {
                "_id": conv.get("id", conv_id),
                "userId": user_id,
                "bookId": conv.get("bookId", book_id),
                "messages": conv.get("messages", []),
                "createdAt": conv.get("createdAt", ""),
            }
            db.conversations.insert_one(conversation)
            conv_count += 1

        # Notes
        for note_id, note in subs.get("notes", {}).items():
            reading_note = {
                "_id": note.get("id", note_id),
                "userId": user_id,
                "bookId": note.get("bookId", book_id),
                "title": note.get("title", ""),
                "chapters": note.get("chapters", {}),
                "key_insights": note.get("key_insights", []),
                "themes": note.get("themes", []),
                "questions": note.get("questions", []),
                "character_notes": note.get("character_notes", {}),
                "quotable_passages": note.get("quotable_passages", []),
                "createdAt": note.get("createdAt", ""),
            }
            db.cloud_notes.insert_one(reading_note)
            notes_count += 1

    print(f"  reading_progress: {prog_count} docs")
    print(f"  highlights: {hl_count} docs")
    print(f"  conversations: {conv_count} docs")
    print(f"  cloud_notes: {notes_count} docs")


def import_feed():
    """Cloud feed → MongoDB feed (non-highlight posts only)."""
    data = load("feed.json")
    db.feed.delete_many({})
    count = 0
    for fid, doc in data.items():
        if doc.get("type") == "highlight":
            continue  # highlights come from highlights collection
        post = {
            "_id": doc.get("id", fid),
            "type": doc.get("type", "story"),
            "userId": doc.get("userId", ""),
            "userName": doc.get("userName", ""),
            "bookId": doc.get("bookId", ""),
            "bookTitle": doc.get("bookTitle", ""),
            "chapterNum": doc.get("chapter", doc.get("chapterNum", 0)),
            "text": doc.get("content", doc.get("text", "")),
            "quote": doc.get("quote", ""),
            "likes": doc.get("likes", 0),
            "comments": doc.get("comments", []),
            "createdAt": doc.get("createdAt", ""),
            "isSpoiler": doc.get("isSpoiler", False),
        }
        db.feed.insert_one(post)
        count += 1
    print(f"  feed: {count} docs (non-highlight)")


def import_reading_history():
    """Cloud readingHistory → MongoDB reading_history."""
    data = load("readingHistory.json")
    db.reading_history.delete_many({})
    count = 0
    for rid, doc in data.items():
        entry = {"_id": doc.get("id", rid), **doc}
        entry.pop("id", None)
        db.reading_history.insert_one(entry)
        count += 1
    print(f"  reading_history: {count} docs")


def import_forest():
    """Cloud forest → MongoDB forest."""
    data = load("forest.json")
    db.forest.delete_many({})
    count = 0
    for fid, doc in data.items():
        db.forest.insert_one({"_id": fid, **doc})
        count += 1
    print(f"  forest: {count} docs")


def import_gifts():
    """Cloud gifts → MongoDB gifts."""
    data = load("gifts.json")
    db.gifts.delete_many({})
    count = 0
    for gid, doc in data.items():
        db.gifts.insert_one({"_id": doc.get("id", gid), **doc})
        count += 1
    print(f"  gifts: {count} docs")


def enrich_highlight_usernames():
    """Fill in userName on highlights from users collection."""
    users = {d["_id"]: d.get("name", "") for d in db.users.find()}
    result = 0
    for hl in db.highlights.find({"userName": ""}):
        name = users.get(hl.get("userId", ""), "")
        if name:
            db.highlights.update_one({"_id": hl["_id"]}, {"$set": {"userName": name}})
            result += 1
    print(f"  enriched {result} highlight userNames")


if __name__ == "__main__":
    print("Importing cloud Firestore dump into MongoDB...")
    import_users()
    import_reading_progress()
    import_feed()
    import_reading_history()
    import_forest()
    import_gifts()
    enrich_highlight_usernames()
    print("\nDone! Cloud data imported into 'booky' database.")
