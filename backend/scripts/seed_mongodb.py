"""Seed MongoDB with local JSON data files."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["booky"]

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "data")


def seed_users():
    with open(os.path.join(DATA_DIR, "users.json"), encoding="utf-8") as f:
        users = json.load(f)
    db.users.delete_many({})
    for user in users:
        db.users.insert_one({"_id": user["id"], **user})
    print(f"  users: {len(users)} docs")


def seed_highlights():
    with open(os.path.join(DATA_DIR, "highlights.json"), encoding="utf-8") as f:
        highlights = json.load(f)
    db.highlights.delete_many({})
    for hl in highlights:
        if "likers" not in hl:
            hl["likers"] = []
        db.highlights.insert_one({"_id": hl["id"], **hl})
    print(f"  highlights: {len(highlights)} docs")


def seed_reading_progress():
    with open(os.path.join(DATA_DIR, "reading-progress.json"), encoding="utf-8") as f:
        progress = json.load(f)
    db.reading_progress.delete_many({})
    for p in progress:
        doc_id = f"{p['userId']}_{p['bookId']}"
        db.reading_progress.insert_one({"_id": doc_id, **p})
    print(f"  reading_progress: {len(progress)} docs")


def seed_feed():
    with open(os.path.join(DATA_DIR, "feed.json"), encoding="utf-8") as f:
        posts = json.load(f)
    db.feed.delete_many({})
    # Only seed non-highlight posts (highlights come from highlights collection)
    non_hl = [p for p in posts if p.get("type") != "highlight"]
    for post in non_hl:
        db.feed.insert_one({"_id": post["id"], **post})
    print(f"  feed: {len(non_hl)} docs (excluded {len(posts) - len(non_hl)} highlight posts)")


def seed_choices():
    with open(os.path.join(DATA_DIR, "choices.json"), encoding="utf-8") as f:
        choices = json.load(f)
    db.choices.delete_many({})
    for choice in choices:
        db.choices.insert_one({"_id": choice["id"], **choice})
    print(f"  choices: {len(choices)} docs")


if __name__ == "__main__":
    print("Seeding local JSON data into MongoDB...")
    seed_users()
    seed_highlights()
    seed_reading_progress()
    seed_feed()
    seed_choices()
    print("\nDone! All collections seeded into 'booky' database.")
