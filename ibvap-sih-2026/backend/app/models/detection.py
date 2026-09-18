from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class Point(BaseModel):
    x: float
    y: float

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class TrackedDetection(BaseModel):
    track_id: int
    class_name: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: BoundingBox
    centroid: Point
    previous_centroid: Optional[Point] = None
    active: bool = True
    movement_state: str = "UNKNOWN"
    direction: str = "UNKNOWN"

class DetectionPayload(BaseModel):
    camera_id: str = Field(..., min_length=1)
    timestamp: float
    frame_number: int = Field(..., ge=0)
    tracks: List[TrackedDetection]

class DetectionResponse(BaseModel):
    status: str
    message: str
    events_generated: int
    event_ids: List[str]
