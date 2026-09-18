from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional

from app.models.zone import ZoneCreate, ZoneUpdate, ZoneResponse, PaginatedZoneResponse
from app.services.auth import RoleChecker
from app.services import zone_service
from app.database import is_db_connected

router = APIRouter(tags=["Zones"])

@router.post("/", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(
    zone: ZoneCreate,
    current_user: dict = Depends(RoleChecker(["admin"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        result = await zone_service.create_zone(zone)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Failed to create zone: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")

@router.get("/", response_model=PaginatedZoneResponse)
async def get_zones(
    camera_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(RoleChecker(["admin", "operator", "viewer"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        items, total = await zone_service.list_zones(camera_id=camera_id, skip=skip, limit=limit)
        return PaginatedZoneResponse(
            items=items,
            total=total,
            skip=skip,
            limit=limit
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Failed to list zones: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")

@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone(
    zone_id: str,
    current_user: dict = Depends(RoleChecker(["admin", "operator", "viewer"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        zone = await zone_service.get_zone_by_id(zone_id)
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        return zone
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Failed to get zone: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")

@router.patch("/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: str,
    zone_update: ZoneUpdate,
    current_user: dict = Depends(RoleChecker(["admin"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        result = await zone_service.update_zone(zone_id, zone_update)
        if not result:
            raise HTTPException(status_code=404, detail="Zone not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Failed to update zone: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(
    zone_id: str,
    current_user: dict = Depends(RoleChecker(["admin"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        success = await zone_service.delete_zone(zone_id)
        if not success:
            raise HTTPException(status_code=404, detail="Zone not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Failed to delete zone: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")
