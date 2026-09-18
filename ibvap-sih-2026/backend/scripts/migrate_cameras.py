import asyncio
from datetime import datetime, timezone
import motor.motor_asyncio
from app.config import settings

async def migrate_cameras():
    print('Connecting to MongoDB...')
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]
    
    now = datetime.now(timezone.utc)
    
    result = await db.cameras.update_many(
        {"created_at": {"$exists": False}},
        {"$set": {"created_at": now, "updated_at": now}}
    )
    
    print(f'Migrated {result.modified_count} cameras')
    
if __name__ == '__main__':
    asyncio.run(migrate_cameras())
