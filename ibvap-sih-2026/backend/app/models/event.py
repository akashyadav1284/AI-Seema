from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SecurityEvent(BaseModel):
    event_id: str
    event_type: str
    severity: str
    camera_id: str
    timestamp: float
    object_type: str
    track_id: int
    confidence: float
    zone_id: str
    status: str = "PENDING_REVIEW"
    reason: str
    
    # Evidence
    snapshot_path: Optional[str] = None
    clip_path: Optional[str] = None
    
    # Optional metadata from tracking
    rule_id: Optional[str] = None
    movement_state: Optional[str] = None
    direction: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EventReviewUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class PaginatedEventResponse(BaseModel):
    items: List[SecurityEvent]
    total: int
    skip: int
    limit: int
