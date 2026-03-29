"""Seed local JSON data files into Firestore (emulator or production)."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Point to emulator before importing firebase
os.environ.setdefault("FIRESTORE_EMULATOR_HOST", "localhost:8080")

import firebase_admin
from firebase_admin import credentials, firestore

class _EmulatorCred(firebase_admin.credentials.Base):
    def get_credential(self):
        return None

if not firebase_admin._apps:
    firebase_admin.initialize_app(_EmulatorCred(), options={"projectId": "theta-bliss-486220-s1"})

db = firestore.client()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "data")


def seed_users():
    with open(os.path.join(DATA_DIR, "users.json"), encoding="utf-8") as f:
        users = json.load(f)
    col = db.collection("users")
    for user in users:
        col.document(user["id"]).set(user)
    print(f"  users: {len(users)} docs")


def seed_highlights():
    with open(os.path.join(DATA_DIR, "highlights.json"), encoding="utf-8") as f:
        highlights = json.load(f)
    col = db.collection("highlights")
    for hl in highlights:
        if "likers" not in hl:
            hl["likers"] = []
        col.document(hl["id"]).set(hl)
    print(f"  highlights: {len(highlights)} docs")


def seed_reading_progress():
    with open(os.path.join(DATA_DIR, "reading-progress.json"), encoding="utf-8") as f:
        progress = json.load(f)
    col = db.collection("reading_progress")
    for p in progress:
        doc_id = f"{p['userId']}_{p['bookId']}"
        col.document(doc_id).set(p)
    print(f"  reading_progress: {len(progress)} docs")


def seed_feed():
    with open(os.path.join(DATA_DIR, "feed.json"), encoding="utf-8") as f:
        posts = json.load(f)
    col = db.collection("feed")
    for post in posts:
        col.document(post["id"]).set(post)
    print(f"  feed: {len(posts)} docs")


def seed_choices():
    with open(os.path.join(DATA_DIR, "choices.json"), encoding="utf-8") as f:
        choices = json.load(f)
    col = db.collection("choices")
    for choice in choices:
        col.document(choice["id"]).set(choice)
    print(f"  choices: {len(choices)} docs")


if __name__ == "__main__":
    print("Seeding local JSON data into Firestore...")
    seed_users()
    seed_highlights()
    seed_reading_progress()
    seed_feed()
    seed_choices()
    print("\nDone! All collections seeded.")
