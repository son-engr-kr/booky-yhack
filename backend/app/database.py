import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
import chromadb
from app.config import settings

# Point to emulator if enabled
if settings.use_firebase_emulator:
    os.environ["FIRESTORE_EMULATOR_HOST"] = settings.firestore_emulator_host
    os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = settings.auth_emulator_host
    firebase_admin.initialize_app(options={"projectId": "theta-bliss-486220-s1"})
elif settings.firebase_credentials_path:
    cred = credentials.Certificate(settings.firebase_credentials_path)
    firebase_admin.initialize_app(cred)
else:
    firebase_admin.initialize_app()

db = firestore.client()
firebase_auth = auth

# Chroma init
chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)


def get_collection(name: str):
    return chroma_client.get_or_create_collection(name=name)
