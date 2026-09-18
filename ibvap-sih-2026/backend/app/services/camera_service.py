from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

from app.database import get_db
from app.models.camera import CameraCreate, CameraUpdate, CameraInDB

logger = logging.getLogger(__name__)

def get_utc_now():
    return datetime.now(timezone.utc)

async def create_camera(camera_data: CameraCreate) -> Optional[Dict[str, Any]]:
    db = get_db()
    
    # Check duplicate
    existing = await db["cameras"].find_one({"camera_id": camera_data.camera_id})
    if existing:
        return None
        
    now = get_utc_now()
    camera_in_db = CameraInDB(
        **camera_data.model_dump(),
        created_at=now,
        updated_at=now
    )
    
    doc = camera_in_db.model_dump()
    await db["cameras"].insert_one(doc)
    return doc

async def get_camera_by_id(camera_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    return await db["cameras"].find_one({"camera_id": camera_id})

async def list_cameras(skip: int = 0, limit: int = 50) -> tuple[List[Dict[str, Any]], int]:
    db = get_db()
    cursor = db["cameras"].find({}).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    total = await db["cameras"].count_documents({})
    return items, total

async def update_camera(camera_id: str, update_data: CameraUpdate) -> Optional[Dict[str, Any]]:
    db = get_db()
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        return await get_camera_by_id(camera_id)
        
    update_dict["updated_at"] = get_utc_now()
    
    result = await db["cameras"].update_one(
        {"camera_id": camera_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        return None
        
    return await get_camera_by_id(camera_id)

async def delete_camera(camera_id: str) -> bool:
    db = get_db()
    result = await db["cameras"].delete_one({"camera_id": camera_id})
    return result.deleted_count > 0
