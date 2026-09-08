import os
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.config import settings

router = APIRouter(tags=["Evidence"])

@router.get("/snapshots/{filename}")
async def get_snapshot(filename: str):
    # Prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")
        
    filepath = os.path.join(settings.EVIDENCE_DIR, "snapshots", filename)
    
    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
        
    return FileResponse(filepath)

@router.get("/clips/{filename}")
async def get_clip(filename: str):
    # Prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")
        
    filepath = os.path.join(settings.EVIDENCE_DIR, "clips", filename)
    
    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
        
    return FileResponse(filepath)
