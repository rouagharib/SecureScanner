from database import users_collection
from passlib.context import CryptContext
from bson import ObjectId

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

async def get_user_by_email(email: str):
    return await users_collection.find_one({"email": email})

async def create_user(name: str, email: str, password: str):
    existing = await get_user_by_email(email)
    if existing:
        return None

    hashed = hash_password(password)
    user = {
        "name": name,
        "email": email,
        "password": hashed,
    }
    result = await users_collection.insert_one(user)
    user["_id"] = result.inserted_id
    return user

def format_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
    }