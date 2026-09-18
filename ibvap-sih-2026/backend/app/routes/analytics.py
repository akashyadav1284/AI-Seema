from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional

from app.models.analytics import (
    SummaryMetrics, 
    EventAnalyticsResponse, 
    TrendResponse, 
    AlertAnalyticsResponse
)
from app.services.analytics_service import analytics_service
from app.services.auth import RoleChecker
from app.database import is_db_connected

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

# All analytics are accessible to admin, operator, and viewer
role_checker = RoleChecker(["admin", "operator", "viewer"])

@router.get("/summary", response_model=SummaryMetrics)
async def get_summary_metrics(current_user: dict = Depends(role_checker)):
    """Get high-level summary counts of the entire system."""
    if not is_db_connected():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not connected")
    return await analytics_service.get_summary_metrics()

@router.get("/events", response_model=EventAnalyticsResponse)
async def get_event_analytics(
    start_time: Optional[float] = Query(None, description="Start timestamp in seconds"),
    end_time: Optional[float] = Query(None, description="End timestamp in seconds"),
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH)"),
    current_user: dict = Depends(role_checker)
):
    """Get event distribution analytics (by type, severity, camera) with optional filters."""
    if not is_db_connected():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not connected")
        
    if start_time is not None and end_time is not None and start_time > end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_time cannot be greater than end_time")
        
    return await analytics_service.get_event_analytics(start_time, end_time, camera_id, severity)

@router.get("/events/trends", response_model=TrendResponse)
async def get_event_trends(
    start_time: float = Query(..., description="Start timestamp in seconds"),
    end_time: float = Query(..., description="End timestamp in seconds"),
    interval: str = Query("day", regex="^(hour|day|week)$", description="Grouping interval (hour, day, week)"),
    current_user: dict = Depends(role_checker)
):
    """Get event counts grouped by a time interval (trends)."""
    if not is_db_connected():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not connected")
        
    if start_time > end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_time cannot be greater than end_time")
        
    return await analytics_service.get_event_trends(start_time, end_time, interval)

@router.get("/alerts", response_model=AlertAnalyticsResponse)
async def get_alert_analytics(current_user: dict = Depends(role_checker)):
    """Get aggregated alert metrics."""
    if not is_db_connected():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not connected")
    return await analytics_service.get_alert_analytics()
