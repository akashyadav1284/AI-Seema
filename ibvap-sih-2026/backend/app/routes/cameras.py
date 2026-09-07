from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(tags=["Cameras"])

class CameraCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    camera_id: str = Field(..., min_length=1, max_length=50)
    source_type: str = Field(..., pattern="^(webcam|video|rtsp)$")
    source: str = Field(..., min_length=1)

@router.get("/")
async def get_cameras():
    # Placeholder for Phase 1
    return {
        "items": [],
        "total": 0
    }

@router.post("/")
async def create_camera(camera: CameraCreate):
    # Placeholder for Phase 1 - do not store real credentials
    # In future phases, this will trigger camera analytics engine
    return {
        "message": "Camera registered successfully (Phase 1 placeholder)",
        "camera_id": camera.camera_id
    }
