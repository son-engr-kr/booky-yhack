from pymongo import MongoClient
from app.config import settings

client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=3000, connectTimeoutMS=3000)
db = client[settings.mongodb_db]
