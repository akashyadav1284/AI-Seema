from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.alert import PaginatedAlertResponse, SecurityAlert
from app.services.alert_service import alert_service
from app.services.auth import RoleChecker, get_current_user
from app.database import is_db_connected

router = APIRouter(tags=["Alerts"])

@router.get("/", response_model=PaginatedAlertResponse)
async def list_alerts(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    camera_id: Optional[str] = None,
    severity: Optional[str] = None,
    current_user: dict = Depends(RoleChecker(["admin", "operator", "viewer"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    filters = {}
    if status:
        filters["status"] = status
    if camera_id:
        filters["camera_id"] = camera_id
    if severity:
        filters["severity"] = severity
        
    items, total = await alert_service.get_alerts(skip=skip, limit=limit, filters=filters)
    return PaginatedAlertResponse(items=items, total=total, skip=skip, limit=limit)

@router.get("/{alert_id}", response_model=SecurityAlert)
async def get_alert(
    alert_id: str,
    current_user: dict = Depends(RoleChecker(["admin", "operator", "viewer"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    alert = await alert_service.get_alert_by_id(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    return alert

@router.patch("/{alert_id}/acknowledge", response_model=SecurityAlert)
async def acknowledge_alert(
    alert_id: str,
    current_user: dict = Depends(RoleChecker(["admin", "operator"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        alert = await alert_service.update_alert_status(alert_id, "ACKNOWLEDGED", current_user["email"])
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return alert
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.patch("/{alert_id}/resolve", response_model=SecurityAlert)
async def resolve_alert(
    alert_id: str,
    current_user: dict = Depends(RoleChecker(["admin", "operator"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")
        
    try:
        alert = await alert_service.update_alert_status(alert_id, "RESOLVED", current_user["email"])
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return alert
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
