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
        
        # Create indexes
        try:
            database = get_db()
            await database["users"].create_index("email", unique=True)
            await database["events"].create_index("event_id", unique=True)
            await database["events"].create_index("timestamp", direction=-1)
            await database["events"].create_index([("camera_id", 1), ("timestamp", -1)])
            await database["events"].create_index([("status", 1), ("timestamp", -1)])
            await database["cameras"].create_index("camera_id", unique=True)
            await database["cameras"].create_index([("created_at", -1)])
            await database["zones"].create_index("zone_id", unique=True)
            await database["zones"].create_index([("camera_id", 1), ("created_at", -1)])
            
            # Alerts Indexes
            await database["alerts"].create_index("alert_id", unique=True)
            await database["alerts"].create_index("event_id", unique=True) # Idempotency
            await database["alerts"].create_index([("status", 1), ("created_at", -1)])
            
            logger.info("MongoDB indexes verified.")
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
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
