from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional

from app.models.camera import CameraCreate, CameraUpdate, CameraResponse, PaginatedCameraResponse
from app.services.auth import RoleChecker
from app.services import camera_service
from app.database import is_db_connected

router = APIRouter(tags=["Cameras"])

@router.post("/", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(
    camera: CameraCreate,
    current_user: dict = Depends(RoleChecker(["admin"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        result = await camera_service.create_camera(camera)
        if not result:
            raise HTTPException(status_code=400, detail="Camera ID already exists")
        return result
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Failed to create camera: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")

@router.get("/", response_model=PaginatedCameraResponse)
async def get_cameras(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(RoleChecker(["admin", "operator", "viewer"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        items, total = await camera_service.list_cameras(skip=skip, limit=limit)
        return PaginatedCameraResponse(
            items=items,
            total=total,
            skip=skip,
            limit=limit
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Failed to list cameras: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")

@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: str,
    current_user: dict = Depends(RoleChecker(["admin", "operator", "viewer"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        camera = await camera_service.get_camera_by_id(camera_id)
        if not camera:
            raise HTTPException(status_code=404, detail="Camera not found")
        return camera
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Failed to get camera: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")

@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: str,
    camera_update: CameraUpdate,
    current_user: dict = Depends(RoleChecker(["admin"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        result = await camera_service.update_camera(camera_id, camera_update)
        if not result:
            raise HTTPException(status_code=404, detail="Camera not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Failed to update camera: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")

@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: str,
    current_user: dict = Depends(RoleChecker(["admin"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        success = await camera_service.delete_camera(camera_id)
        if not success:
            raise HTTPException(status_code=404, detail="Camera not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Failed to delete camera: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")
