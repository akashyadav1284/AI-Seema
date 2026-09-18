import os
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import FileResponse
from typing import Optional

from app.config import settings
from app.services.auth import get_current_user, RoleChecker
from app.database import get_db, is_db_connected

router = APIRouter(tags=["Evidence"])

def extract_event_id(filename: str) -> str:
    """Extract event_id from a filename (e.g. EVT-123.jpg -> EVT-123)"""
    return os.path.splitext(filename)[0]

def is_safe_path(base_dir: str, target_path: str) -> bool:
    """Ensure the resolved target path mathematically resides inside base_dir."""
    try:
        real_base = os.path.realpath(base_dir)
        real_target = os.path.realpath(target_path)
        return os.path.commonpath([real_base, real_target]) == real_base
    except Exception:
        return False

@router.get("/snapshots/{filename}")
async def get_snapshot(filename: str, current_user: dict = Depends(RoleChecker(["admin", "operator", "viewer"]))):
    if not is_db_connected():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not available")

    # Early rejection of obvious traversal characters
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename format")

    event_id = extract_event_id(filename)
    db = get_db()
    
    # Secure server-side lookup
    event = await db["events"].find_one({"event_id": event_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
        
    snapshot_path = event.get("snapshot_path")
    if not snapshot_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    # Path traversal and existence check
    base_snapshots_dir = os.path.join(settings.EVIDENCE_DIR, "snapshots")
    if not is_safe_path(base_snapshots_dir, snapshot_path):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid evidence reference")
        
    if not os.path.exists(snapshot_path) or not os.path.isfile(snapshot_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
        
    return FileResponse(snapshot_path, media_type="image/jpeg")


@router.get("/clips/{filename}")
async def get_clip(filename: str, current_user: dict = Depends(RoleChecker(["admin", "operator", "viewer"]))):
    if not is_db_connected():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not available")

    # Early rejection of obvious traversal characters
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename format")

    event_id = extract_event_id(filename)
    db = get_db()
    
    # Secure server-side lookup
    event = await db["events"].find_one({"event_id": event_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
        
    clip_path = event.get("clip_path")
    if not clip_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    # Path traversal and existence check
    base_clips_dir = os.path.join(settings.EVIDENCE_DIR, "clips")
    if not is_safe_path(base_clips_dir, clip_path):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid evidence reference")
        
    if not os.path.exists(clip_path) or not os.path.isfile(clip_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
        
    return FileResponse(clip_path, media_type="video/mp4")
