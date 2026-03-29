"""Seed the local Firebase Emulator Firestore with pulled cloud data."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Point to emulator BEFORE importing firebase
os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"

import firebase_admin
from firebase_admin import credentials, firestore

# Use a dummy credential for emulator — it doesn't validate
class _EmulatorCred(firebase_admin.credentials.Base):
    def get_credential(self):
        return None

if not firebase_admin._apps:
    firebase_admin.initialize_app(_EmulatorCred(), options={"projectId": "theta-bliss-486220-s1"})

db = firestore.client()

DUMP_DIR = "./firestore_dump"


def upload_doc(collection_ref, doc_id, doc_data):
    """Upload a document, handling subcollections."""
    subcollections = doc_data.pop("_subcollections", None)
    collection_ref.document(doc_id).set(doc_data)

    if subcollections:
        for sub_name, sub_docs in subcollections.items():
            sub_ref = collection_ref.document(doc_id).collection(sub_name)
            for sub_doc_id, sub_doc_data in sub_docs.items():
                upload_doc(sub_ref, sub_doc_id, sub_doc_data)


def seed():
    if not os.path.exists(DUMP_DIR):
        print(f"No dump directory found at {DUMP_DIR}")
        print("Run pull_firestore.py first to export cloud data.")
        return

    json_files = [f for f in os.listdir(DUMP_DIR) if f.endswith(".json")]
    if not json_files:
        print("No JSON files found in dump directory.")
        return

    for filename in json_files:
        collection_name = filename.replace(".json", "")
        filepath = os.path.join(DUMP_DIR, filename)

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"Seeding '{collection_name}' ({len(data)} docs)...")
        col_ref = db.collection(collection_name)
        for doc_id, doc_data in data.items():
            upload_doc(col_ref, doc_id, doc_data)

        print(f"  Done.")

    print(f"\nAll collections seeded into emulator!")


if __name__ == "__main__":
    seed()
