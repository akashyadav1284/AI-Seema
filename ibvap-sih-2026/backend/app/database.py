from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.utils.logger import logger

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    try:
        logger.info("Connecting to MongoDB...")
        db_instance.client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        db_instance.db = db_instance.client[settings.MONGO_DB_NAME]
        # Verify connection
        await db_instance.client.server_info()
        logger.info("Successfully connected to MongoDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        # We don't raise here to allow the app to start in degraded mode
        db_instance.client = None
        db_instance.db = None

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed")

def get_db():
    return db_instance.db

def is_db_connected():
    return db_instance.client is not None
