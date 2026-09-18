from typing import List, Dict, Any, Optional
from app.database import get_db, is_db_connected
from app.utils.logger import logger

class ConfigService:
    """
    Service to fetch AI pipeline configuration from the backend database.
    """
    
    @staticmethod
    async def get_camera_config(camera_id: str) -> Optional[Dict[str, Any]]:
        if not is_db_connected():
            logger.warning("DB not connected, returning None for camera config.")
            return None
            
        db = get_db()
        try:
            camera = await db["cameras"].find_one({"camera_id": camera_id})
            return camera
        except Exception as e:
            logger.error(f"Failed to fetch camera config for {camera_id}: {e}")
            return None

    @staticmethod
    async def get_zones(camera_id: str) -> List[Dict[str, Any]]:
        if not is_db_connected():
            return []
            
        db = get_db()
        try:
            cursor = db["zones"].find({"camera_id": camera_id, "active": True})
            zones = await cursor.to_list(length=100)
            return zones
        except Exception as e:
            logger.error(f"Failed to fetch zones for {camera_id}: {e}")
            return []
            
    @staticmethod
    async def get_fences(camera_id: str) -> List[Dict[str, Any]]:
        if not is_db_connected():
            return []
            
        db = get_db()
        try:
            # Assuming 'fences' is the collection name for virtual fences
            cursor = db["fences"].find({"camera_id": camera_id, "active": True})
            fences = await cursor.to_list(length=100)
            return fences
        except Exception as e:
            logger.error(f"Failed to fetch fences for {camera_id}: {e}")
            return []
