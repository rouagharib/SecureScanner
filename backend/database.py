from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "securescan")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

# Collections
users_collection = db["users"]
scans_collection = db["scans"]

async def connect_db():
    print("✅ Connected to MongoDB")

async def close_db():
    client.close()