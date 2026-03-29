"""Pull all data from cloud Firestore and save as local JSON files."""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("./firebase-service-account.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

OUTPUT_DIR = "./firestore_dump"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def serialize(doc_dict):
    """Convert Firestore types to JSON-serializable types."""
    result = {}
    for k, v in doc_dict.items():
        if hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        elif isinstance(v, dict):
            result[k] = serialize(v)
        elif isinstance(v, list):
            result[k] = [serialize(i) if isinstance(i, dict) else str(i) if hasattr(i, "isoformat") else i for i in v]
        else:
            result[k] = v
    return result


def pull_collection(collection_name, parent_ref=None):
    """Recursively pull a collection and its subcollections."""
    ref = parent_ref.collection(collection_name) if parent_ref else db.collection(collection_name)
    docs = ref.stream()
    data = {}
    for doc in docs:
        doc_data = serialize(doc.to_dict())
        data[doc.id] = doc_data
        # Check for subcollections
        for subcol in doc.reference.collections():
            sub_data = pull_collection(subcol.id, doc.reference)
            if sub_data:
                if "_subcollections" not in data[doc.id]:
                    data[doc.id]["_subcollections"] = {}
                data[doc.id]["_subcollections"][subcol.id] = sub_data
    return data


# List all top-level collections
print("Discovering collections...")
collections = [col.id for col in db.collections()]
print(f"Found collections: {collections}")

for col_name in collections:
    print(f"\nPulling '{col_name}'...")
    data = pull_collection(col_name)
    filepath = os.path.join(OUTPUT_DIR, f"{col_name}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(data)} documents to {filepath}")

print(f"\nDone! All data saved to {OUTPUT_DIR}/")
