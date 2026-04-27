from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URL, DB_NAME

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]


# Collections
users_collection = db["users"]
scans_collection = db["scans"]
subscriptions_collection = db["subscriptions"]
usage_collection = db["usage"]
verification_tokens_collection = db["verification_tokens"]
password_reset_tokens = db["password_reset_tokens"]

async def connect_db():
    try:
        # Ping the database
        await client.admin.command("ping")
        print("✅ Connected to MongoDB")
    except Exception as e:
        print("❌ Failed to connect to MongoDB:", e)
async def close_db():
    client.close()