import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_CONNECTION_STRING")
client = AsyncIOMotorClient(MONGO_URL)

# Create a database named 'educator_rag' and a collection named 'users'
db = client.educator_rag
users_collection = db.users