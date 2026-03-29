"""Convert Firestore dump to local JSON format that routers expect."""
import json
import os

DUMP_DIR = "./firestore_dump"
DATA_DIR = "./app/data"


def load_dump(name):
    with open(os.path.join(DUMP_DIR, f"{name}.json"), encoding="utf-8") as f:
        return json.load(f)


def save_data(name, data):
    with open(os.path.join(DATA_DIR, name), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved {name}")


def sync_users():
    """Convert Firestore users to local users.json format."""
    fs_users = load_dump("users")
    users = []

    # Map 'demo-user' or first real user as 'me'
    me_key = "demo-user" if "demo-user" in fs_users else list(fs_users.keys())[0]

    for doc_id, data in fs_users.items():
        is_me = doc_id == me_key
        user = {
            "id": "me" if is_me else doc_id,
            "name": data.get("displayName", data.get("name", doc_id)),
            "avatar": data.get("avatar", data.get("photoURL")),
            "planetImage": data.get("planetImage", "planet2.png"),
            "planetStyle": data.get("planetStyle", "forest"),
            "level": data.get("level", 1),
            "booksRead": data.get("booksRead", 0),
            "totalNotes": data.get("totalNotes", 0),
            "totalChoices": data.get("totalChoices", 0),
            "genres": data.get("genres", {}),
        }
        if not is_me:
            user["similarity"] = data.get("similarity", 50)
        users.append(user)

    save_data("users.json", users)
    return users


def sync_books():
    """Convert Firestore books to local books.json format."""
    fs_books = load_dump("books")
    books = []
    chapters_all = {}

    for book_id, data in fs_books.items():
        book = {
            "id": book_id,
            "title": data.get("title", book_id),
            "author": data.get("author", "Unknown"),
            "genre": data.get("genre", ""),
            "cover": data.get("coverUrl", data.get("cover", "")),
            "totalChapters": data.get("totalChapters", 0),
            "description": data.get("description", ""),
            "year": data.get("year", 0),
        }
        books.append(book)

        # Extract chapters from subcollections
        subs = data.get("_subcollections", {})
        if "chapters" in subs:
            chapters_all[book_id] = {}
            for ch_id, ch_data in subs["chapters"].items():
                chapters_all[book_id][ch_id] = {
                    "chapterNum": ch_data.get("chapterNum", int(ch_id) if ch_id.isdigit() else 0),
                    "title": ch_data.get("title", f"Chapter {ch_id}"),
                    "bookId": book_id,
                    "text": ch_data.get("text", ""),
                }

    save_data("books.json", books)
    save_data("chapters.json", chapters_all)
    return books


def sync_reading_progress():
    """Convert Firestore userBooks to local reading-progress.json format."""
    fs_ub = load_dump("userBooks")
    progress = []

    for doc_id, data in fs_ub.items():
        uid = data.get("userId", "")
        # Map real UID to 'me' if it matches
        if uid and not uid.startswith("friend-") and uid != "demo-user":
            uid = "me"

        entry = {
            "userId": uid,
            "bookId": data.get("bookId", ""),
            "currentChapter": data.get("currentChapter", 0),
            "totalChapters": data.get("totalChapters", 0),
            "percentage": data.get("percentage", 0),
            "status": data.get("status", "reading"),
            "startedAt": data.get("startedAt", ""),
            "completedAt": data.get("completedAt"),
            "notesCount": data.get("notesCount", 0),
            "questionsAnswered": data.get("questionsAnswered", 0),
        }
        progress.append(entry)

    save_data("reading-progress.json", progress)
    return progress


def sync_feed():
    """Convert Firestore feed to local feed.json format."""
    fs_feed = load_dump("feed")
    feed = []

    for doc_id, data in fs_feed.items():
        post = {
            "id": data.get("id", doc_id),
            "type": data.get("type", "highlight"),
            "userId": data.get("userId", ""),
            "userName": data.get("userName", ""),
            "bookId": data.get("bookId", ""),
            "bookTitle": data.get("bookTitle", ""),
            "chapterNum": data.get("chapter", data.get("chapterNum", 0)),
            "text": data.get("content", data.get("text", "")),
            "quote": data.get("highlightedText", data.get("quote")),
            "likes": len(data["likes"]) if isinstance(data.get("likes"), list) else data.get("likes", 0),
            "comments": data.get("comments", []),
            "createdAt": data.get("createdAt", ""),
            "isSpoiler": data.get("isSpoiler", False),
        }
        feed.append(post)

    save_data("feed.json", feed)
    return feed


def sync_highlights():
    """Extract highlights from Firestore users subcollections."""
    fs_users = load_dump("users")
    highlights = []

    for doc_id, data in fs_users.items():
        subs = data.get("_subcollections", {})
        if "highlights" in subs:
            for hl_id, hl_data in subs["highlights"].items():
                hl = {
                    "id": hl_data.get("id", hl_id),
                    "bookId": hl_data.get("bookId", ""),
                    "chapterNum": hl_data.get("chapter", 0),
                    "userId": hl_data.get("userId", doc_id),
                    "userName": hl_data.get("userName", ""),
                    "text": hl_data.get("selectedText", hl_data.get("text", "")),
                    "comment": hl_data.get("note", hl_data.get("comment", "")),
                    "color": hl_data.get("color", "#FFD700"),
                    "likes": len(hl_data["likes"]) if isinstance(hl_data.get("likes"), list) else 0,
                    "replies": hl_data.get("replies", []),
                    "createdAt": hl_data.get("createdAt", ""),
                }
                highlights.append(hl)

    save_data("highlights.json", highlights)
    return highlights


if __name__ == "__main__":
    print("Syncing Firestore dump to local JSON format...")
    print("\n[users]")
    sync_users()
    print("\n[books + chapters]")
    sync_books()
    print("\n[reading-progress]")
    sync_reading_progress()
    print("\n[feed]")
    sync_feed()
    print("\n[highlights]")
    sync_highlights()
    print("\nDone! Local data updated from Firestore.")
