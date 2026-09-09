from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, List
from datetime import datetime

from app.database import get_db, is_db_connected
from app.models.event import SecurityEvent, EventReviewUpdate, PaginatedEventResponse

router = APIRouter(tags=["Events"])

ALLOWED_STATUSES = ["PENDING_REVIEW", "VERIFIED", "FALSE_ALERT", "UNDER_INVESTIGATION"]

@router.get("/", response_model=PaginatedEventResponse)
async def get_events(
    camera_id: Optional[str] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    review_status: Optional[str] = Query(None, alias="status"),
    track_id: Optional[int] = None,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    if not is_db_connected():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not available")
        
    db = get_db()
    
    # Build match query
    query = {}
    if camera_id:
        query["camera_id"] = camera_id
    if event_type:
        query["event_type"] = event_type
    if severity:
        query["severity"] = severity
    if review_status:
        query["status"] = review_status
    if track_id is not None:
        query["track_id"] = track_id
        
    if start_time or end_time:
        query["timestamp"] = {}
        if start_time:
            query["timestamp"]["$gte"] = start_time
        if end_time:
            query["timestamp"]["$lte"] = end_time

    try:
        # Fetch total count
        total = await db["events"].count_documents(query)
        
        # Fetch paginated items, sorted by timestamp DESC
        cursor = db["events"].find(query).sort("timestamp", -1).skip(skip).limit(limit)
        items = await cursor.to_list(length=limit)
        
        # Ensure ID mapping if needed, though event_id is explicit
        return PaginatedEventResponse(
            items=[SecurityEvent(**item) for item in items],
            total=total,
            skip=skip,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database query failed: {str(e)}")

@router.get("/{event_id}", response_model=SecurityEvent)
async def get_event_by_id(event_id: str):
    if not is_db_connected():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not available")
        
    db = get_db()
    event = await db["events"].find_one({"event_id": event_id})
    
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        
    return SecurityEvent(**event)

@router.patch("/{event_id}/review", response_model=SecurityEvent)
async def review_event(event_id: str, review: EventReviewUpdate):
    if not is_db_connected():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not available")
        
    if review.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid status. Allowed values: {ALLOWED_STATUSES}"
        )
        
    db = get_db()
    
    update_data = {"status": review.status}
    if review.notes is not None:
        update_data["notes"] = review.notes
        
    result = await db["events"].update_one(
        {"event_id": event_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        
    # Fetch updated document
    updated_event = await db["events"].find_one({"event_id": event_id})
    return SecurityEvent(**updated_event)
