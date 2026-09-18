from pydantic import BaseModel
from typing import Optional, List
import time

class SecurityAlert(BaseModel):
    alert_id: str
    event_id: str
    camera_id: str
    alert_type: str
    severity: str
    status: str = "NEW"  # NEW, ACKNOWLEDGED, RESOLVED
    message: str
    created_at: float
    acknowledged_at: Optional[float] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[float] = None
    resolved_by: Optional[str] = None

class PaginatedAlertResponse(BaseModel):
    items: List[SecurityAlert]
    total: int
    skip: int
    limit: int
