from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

from app.database import get_db
from app.models.zone import ZoneCreate, ZoneUpdate, ZoneInDB
from app.services.camera_service import get_camera_by_id

logger = logging.getLogger(__name__)

def get_utc_now():
    return datetime.now(timezone.utc)

async def create_zone(zone_data: ZoneCreate) -> Optional[Dict[str, Any]]:
    db = get_db()
    
    # Check duplicate
    existing = await db["zones"].find_one({"zone_id": zone_data.zone_id})
    if existing:
        raise ValueError("Zone ID already exists")
        
    # Check camera exists
    camera = await get_camera_by_id(zone_data.camera_id)
    if not camera:
        raise ValueError("Referenced camera does not exist")
        
    now = get_utc_now()
    zone_in_db = ZoneInDB(
        **zone_data.model_dump(),
        created_at=now,
        updated_at=now
    )
    
    doc = zone_in_db.model_dump()
    await db["zones"].insert_one(doc)
    return doc

async def get_zone_by_id(zone_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    return await db["zones"].find_one({"zone_id": zone_id})

async def list_zones(camera_id: Optional[str] = None, skip: int = 0, limit: int = 50) -> tuple[List[Dict[str, Any]], int]:
    db = get_db()
    query = {}
    if camera_id:
        query["camera_id"] = camera_id
        
    cursor = db["zones"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    total = await db["zones"].count_documents(query)
    return items, total

async def update_zone(zone_id: str, update_data: ZoneUpdate) -> Optional[Dict[str, Any]]:
    db = get_db()
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        return await get_zone_by_id(zone_id)
        
    update_dict["updated_at"] = get_utc_now()
    
    result = await db["zones"].update_one(
        {"zone_id": zone_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        return None
        
    return await get_zone_by_id(zone_id)

async def delete_zone(zone_id: str) -> bool:
    db = get_db()
    result = await db["zones"].delete_one({"zone_id": zone_id})
    return result.deleted_count > 0
