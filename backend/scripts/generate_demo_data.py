"""Generate rich demo data for all users across all books."""
import random
import uuid
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

random.seed(42)
client = MongoClient("mongodb://localhost:27017")
db = client["booky"]

# ── Books ──
BOOKS = [
    {"id": "great-gatsby", "title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "chapters": 9},
    {"id": "1984", "title": "1984", "author": "George Orwell", "chapters": 8},
    {"id": "pride-prejudice", "title": "Pride and Prejudice", "author": "Jane Austen", "chapters": 8},
    {"id": "frankenstein", "title": "Frankenstein", "author": "Mary Shelley", "chapters": 8},
    {"id": "dracula", "title": "Dracula", "author": "Bram Stoker", "chapters": 8},
    {"id": "alice-wonderland", "title": "Alice's Adventures in Wonderland", "author": "Lewis Carroll", "chapters": 8},
    {"id": "romeo-juliet", "title": "Romeo and Juliet", "author": "William Shakespeare", "chapters": 8},
    {"id": "sherlock-holmes", "title": "The Adventures of Sherlock Holmes", "author": "Arthur Conan Doyle", "chapters": 8},
]

# ── Users ──
USERS = [
    {"_id": "me", "id": "me", "name": "Hunjun Shin", "email": "hunjun@example.com",
     "planetImage": "planet2.png", "planetStyle": "rocky", "level": 5,
     "booksRead": 3, "totalNotes": 12, "totalChoices": 8, "similarity": 100,
     "genres": {"Classic Fiction": 40, "Gothic": 25, "Fantasy": 20, "Romance": 15}},
    {"_id": "friend-alex", "id": "friend-alex", "name": "Alex Kim", "email": "alex@example.com",
     "planetImage": "planet1.png", "planetStyle": "gas-giant", "level": 7,
     "booksRead": 5, "totalNotes": 18, "totalChoices": 12, "similarity": 85,
     "genres": {"Classic Fiction": 45, "Dystopian": 30, "Gothic": 25}},
    {"_id": "friend-mina", "id": "friend-mina", "name": "Mina Park", "email": "mina@example.com",
     "planetImage": "planet3.png", "planetStyle": "ice", "level": 4,
     "booksRead": 3, "totalNotes": 9, "totalChoices": 6, "similarity": 72,
     "genres": {"Romance": 50, "Classic Fiction": 30, "Fantasy": 20}},
    {"_id": "friend-jake", "id": "friend-jake", "name": "Jake Lee", "email": "jake@example.com",
     "planetImage": "planet1.png", "planetStyle": "rocky", "level": 6,
     "booksRead": 4, "totalNotes": 15, "totalChoices": 10, "similarity": 78,
     "genres": {"Dystopian": 40, "Gothic": 35, "Classic Fiction": 25}},
    {"_id": "friend-sofia", "id": "friend-sofia", "name": "Sofia Chen", "email": "sofia@example.com",
     "planetImage": "planet3.png", "planetStyle": "gas-giant", "level": 3,
     "booksRead": 2, "totalNotes": 7, "totalChoices": 4, "similarity": 65,
     "genres": {"Fantasy": 45, "Romance": 35, "Classic Fiction": 20}},
    {"_id": "friend-ryan", "id": "friend-ryan", "name": "Ryan Oh", "email": "ryan@example.com",
     "planetImage": "planet2.png", "planetStyle": "ice", "level": 5,
     "booksRead": 4, "totalNotes": 11, "totalChoices": 9, "similarity": 58,
     "genres": {"Gothic": 40, "Dystopian": 30, "Classic Fiction": 30}},
]

USER_IDS = [u["_id"] for u in USERS]
USER_NAMES = {u["_id"]: u["name"] for u in USERS}

# ── Highlight quotes per book ──
QUOTES = {
    "great-gatsby": [
        ("So we beat on, boats against the current, borne back ceaselessly into the past.", 9),
        ("He had one of those rare smiles with a quality of eternal reassurance in it.", 3),
        ("Her voice is full of money.", 7),
        ("A single green light, minute and far away, at the end of a dock.", 1),
        ("In my younger and more vulnerable years my father gave me some advice.", 1),
        ("His count of enchanted objects had diminished by one.", 5),
        ("They were careless people — they smashed up things and retreated back into their money.", 9),
        ("Can't repeat the past? Why of course you can!", 6),
        ("Gatsby believed in the green light, the orgastic future that year by year recedes before us.", 9),
        ("He looked at her the way all women want to be looked at by a man.", 5),
    ],
    "1984": [
        ("War is peace. Freedom is slavery. Ignorance is strength.", 1),
        ("Big Brother is watching you.", 1),
        ("Who controls the past controls the future. Who controls the present controls the past.", 3),
        ("If you want a picture of the future, imagine a boot stamping on a human face — forever.", 6),
        ("Perhaps one did not want to be loved so much as to be understood.", 4),
        ("The best books are those that tell you what you know already.", 2),
        ("Freedom is the freedom to say that two plus two make four.", 7),
        ("Until they become conscious they will never rebel.", 2),
        ("Reality exists in the human mind, and nowhere else.", 5),
    ],
    "pride-prejudice": [
        ("It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", 1),
        ("She is tolerable, but not handsome enough to tempt me.", 2),
        ("Till this moment I never knew myself.", 7),
        ("I could easily forgive his pride, if he had not mortified mine.", 3),
        ("My good opinion once lost is lost forever.", 4),
        ("Vanity and pride are different things, though the words are often used synonymously.", 3),
        ("There are few people whom I really love, and still fewer of whom I think well.", 2),
        ("A lady's imagination is very rapid; it jumps from admiration to love, from love to matrimony in a moment.", 4),
    ],
    "frankenstein": [
        ("Beware; for I am fearless, and therefore powerful.", 6),
        ("Nothing is so painful to the human mind as a great and sudden change.", 7),
        ("I ought to be thy Adam, but I am rather the fallen angel.", 4),
        ("Life, although it may only be an accumulation of anguish, is dear to me.", 5),
        ("How dangerous is the acquirement of knowledge.", 3),
        ("Even broken in spirit as he is, no one can feel more deeply than he does the beauties of nature.", 1),
        ("I was benevolent and good; misery made me a fiend.", 4),
    ],
    "dracula": [
        ("Listen to them, the children of the night. What music they make!", 2),
        ("The blood is the life!", 5),
        ("We learn from failure, not from success!", 4),
        ("There are darknesses in life and there are lights.", 3),
        ("No man knows till he has suffered from the night how sweet and dear his heart and eye the morning can be.", 6),
        ("I am longing to be with you, and by the sea.", 1),
        ("The strength of the vampire is that people will not believe in him.", 7),
    ],
    "alice-wonderland": [
        ("We're all mad here.", 6),
        ("Curiouser and curiouser!", 1),
        ("Begin at the beginning and go on till you come to the end: then stop.", 3),
        ("Who in the world am I? Ah, that's the great puzzle.", 2),
        ("It's no use going back to yesterday, because I was a different person then.", 5),
        ("Imagination is the only weapon in the war against reality.", 4),
        ("If you don't know where you are going, any road can take you there.", 7),
    ],
    "romeo-juliet": [
        ("My bounty is as boundless as the sea, my love as deep.", 2),
        ("These violent delights have violent ends.", 2),
        ("Parting is such sweet sorrow.", 2),
        ("A plague on both your houses!", 3),
        ("For never was a story of more woe than this of Juliet and her Romeo.", 8),
        ("What's in a name? That which we call a rose by any other name would smell as sweet.", 2),
        ("Don't waste your love on somebody who doesn't value it.", 4),
    ],
    "sherlock-holmes": [
        ("When you have eliminated the impossible, whatever remains, however improbable, must be the truth.", 3),
        ("To Sherlock Holmes she is always the woman.", 1),
        ("I am a brain, Watson. The rest of me is a mere appendix.", 5),
        ("There is nothing more deceptive than an obvious fact.", 2),
        ("The world is full of obvious things which nobody by any chance ever observes.", 4),
        ("Education never ends, Watson. It is a series of lessons, with the greatest for the last.", 7),
        ("Crime is common. Logic is rare.", 6),
    ],
}

# ── Comment templates ──
COMMENTS = [
    "This line hits different every time I read it.",
    "One of the most powerful passages in the whole book.",
    "The writing here is absolutely incredible.",
    "I highlighted this on my first read and it still moves me.",
    "This says so much about the character's inner world.",
    "Fitzgerald at his finest — pure poetry.",
    "The irony here is devastating.",
    "I keep coming back to this quote.",
    "This moment changed the entire story for me.",
    "The symbolism here is masterful.",
    "Goosebumps every single time.",
    "This is where the author shows their genius.",
    "I underlined this three times.",
    "Perfectly captures the mood of the whole chapter.",
    "The subtext here is heartbreaking.",
    "This is the line I'd put on a bookmark.",
    "Such a subtle but powerful observation.",
    "I had to stop reading after this line and just think.",
    "The precision of this language is stunning.",
    "This moment defines the whole novel for me.",
]

REPLIES = [
    "Totally agree! This was my favorite part too.",
    "I interpreted this completely differently — interesting perspective.",
    "Yes! I was just about to highlight the same thing.",
    "Great catch. I missed this on my first read.",
    "This connects to what happens later in a really interesting way.",
    "I think this is foreshadowing something big.",
    "The way you read this is making me reconsider my own take.",
    "Couldn't agree more. Such a well-crafted moment.",
    "I actually had the opposite reaction — but I see your point.",
    "This is why I love reading with friends. Different perspectives!",
    "That's a really thoughtful observation.",
    "I had the exact same thought while reading this chapter!",
    "This gives me chills every time.",
    "You always notice the things I miss!",
    "So true. The author really knew what they were doing here.",
]

# ── Assign books to users: 1/3 completed, 1/3 in-progress, 1/3 not started ──
def assign_books(user_id):
    shuffled = list(BOOKS)
    random.shuffle(shuffled)
    n = len(shuffled)
    completed = shuffled[:n // 3]
    reading = shuffled[n // 3: 2 * n // 3]
    # rest = not started
    return completed, reading


def random_time(days_ago_max=30):
    delta = timedelta(days=random.randint(1, days_ago_max), hours=random.randint(0, 23), minutes=random.randint(0, 59))
    return (datetime.now(timezone.utc) - delta).isoformat()


def gen_id():
    return str(uuid.uuid4())


def main():
    # Clear existing dynamic data
    for col in ["users", "reading_progress", "highlights", "feed", "reading_notes", "character_cache"]:
        db[col].delete_many({})
    print("Cleared existing data.")

    # Insert users
    for u in USERS:
        db.users.insert_one(u)
    print(f"Inserted {len(USERS)} users.")

    progress_docs = []
    highlight_docs = []
    feed_docs = []

    for user in USERS:
        uid = user["_id"]
        uname = user["name"]
        completed, reading = assign_books(uid)

        # Completed books
        for book in completed:
            bid = book["id"]
            total_ch = book["chapters"]
            progress_docs.append({
                "_id": f"{uid}_{bid}",
                "userId": uid,
                "bookId": bid,
                "currentChapter": total_ch,
                "totalChapters": total_ch,
                "percentage": 100,
                "status": "completed",
                "notesCount": random.randint(3, 8),
                "questionsAnswered": random.randint(2, 6),
            })
            # Completion feed post
            feed_docs.append({
                "_id": gen_id(),
                "type": "completion",
                "userId": uid,
                "userName": uname,
                "bookId": bid,
                "bookTitle": book["title"],
                "text": random.choice([
                    f"Just finished {book['title']}! What a journey.",
                    f"Completed {book['title']} — absolutely worth every page.",
                    f"Finally done with {book['title']}. Need time to process this one.",
                    f"{book['title']} is now one of my all-time favorites.",
                ]),
                "rating": random.randint(3, 5),
                "likes": random.randint(0, 8),
                "comments": [],
                "createdAt": random_time(14),
                "isSpoiler": False,
            })

        # Reading books
        for book in reading:
            bid = book["id"]
            total_ch = book["chapters"]
            current = random.randint(max(1, int(total_ch * 0.3)), int(total_ch * 0.6))
            pct = round(current / total_ch * 100)
            progress_docs.append({
                "_id": f"{uid}_{bid}",
                "userId": uid,
                "bookId": bid,
                "currentChapter": current,
                "totalChapters": total_ch,
                "percentage": pct,
                "status": "reading",
                "notesCount": random.randint(1, 5),
                "questionsAnswered": random.randint(0, 3),
            })
            # Story feed post for some
            if random.random() > 0.4:
                feed_docs.append({
                    "_id": gen_id(),
                    "type": "story",
                    "userId": uid,
                    "userName": uname,
                    "bookId": bid,
                    "bookTitle": book["title"],
                    "chapterNum": current,
                    "text": random.choice([
                        f"Chapter {current} of {book['title']} is blowing my mind.",
                        f"Can't put down {book['title']} right now. Chapter {current} is intense.",
                        f"The way {book['author']} writes this part... incredible.",
                        f"Just got to chapter {current} and I have so many thoughts.",
                        f"Reading {book['title']} before bed was a mistake — too good to stop.",
                    ]),
                    "likes": random.randint(0, 6),
                    "comments": [],
                    "createdAt": random_time(10),
                    "isSpoiler": False,
                })

        # Generate highlights for completed + reading books
        for book in completed + reading:
            bid = book["id"]
            quotes = QUOTES.get(bid, [])
            prog = next((p for p in progress_docs if p["userId"] == uid and p["bookId"] == bid), None)
            max_ch = prog["currentChapter"] if prog else book["chapters"]

            # Pick 2-5 random quotes within read chapters
            available = [(q, ch) for q, ch in quotes if ch <= max_ch]
            if not available:
                continue
            picks = random.sample(available, min(random.randint(2, 5), len(available)))

            for quote_text, ch in picks:
                hl_id = gen_id()
                # Generate replies from other users
                replies = []
                reply_users = [u for u in USER_IDS if u != uid]
                num_replies = random.randint(0, 3)
                for _ in range(num_replies):
                    replier = random.choice(reply_users)
                    replies.append({
                        "id": gen_id(),
                        "userId": replier,
                        "userName": USER_NAMES[replier],
                        "text": random.choice(REPLIES),
                        "createdAt": random_time(7),
                    })

                highlight_docs.append({
                    "_id": hl_id,
                    "bookId": bid,
                    "chapterNum": ch,
                    "userId": uid,
                    "userName": uname,
                    "text": quote_text,
                    "comment": random.choice(COMMENTS),
                    "color": random.choice(["#f59e0b", "#6366f1", "#ec4899", "#10b981"]),
                    "likes": random.randint(0, 5),
                    "likers": random.sample(reply_users, random.randint(0, min(3, len(reply_users)))),
                    "replies": replies,
                    "createdAt": random_time(20),
                })

    # Insert all
    if progress_docs:
        db.reading_progress.insert_many(progress_docs)
    if highlight_docs:
        db.highlights.insert_many(highlight_docs)
    if feed_docs:
        db.feed.insert_many(feed_docs)

    print(f"Inserted {len(progress_docs)} reading_progress docs.")
    print(f"Inserted {len(highlight_docs)} highlights (with replies).")
    print(f"Inserted {len(feed_docs)} feed posts.")

    # Stats
    total_replies = sum(len(h.get("replies", [])) for h in highlight_docs)
    print(f"Total replies across all highlights: {total_replies}")
    for uid in USER_IDS:
        hl_count = sum(1 for h in highlight_docs if h["userId"] == uid)
        prog_count = sum(1 for p in progress_docs if p["userId"] == uid)
        print(f"  {USER_NAMES[uid]}: {prog_count} books, {hl_count} highlights")


if __name__ == "__main__":
    main()
