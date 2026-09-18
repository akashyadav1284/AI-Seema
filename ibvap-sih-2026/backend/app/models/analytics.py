from pydantic import BaseModel
from typing import List, Optional

class SummaryMetrics(BaseModel):
    total_cameras: int
    active_cameras: int
    total_events: int
    total_alerts: int
    unresolved_alerts: int
    acknowledged_alerts: int
    resolved_alerts: int

class EventDistributionItem(BaseModel):
    name: str
    count: int

class EventAnalyticsResponse(BaseModel):
    by_type: List[EventDistributionItem]
    by_severity: List[EventDistributionItem]
    by_camera: List[EventDistributionItem]

class TrendItem(BaseModel):
    timestamp: str
    count: int

class TrendResponse(BaseModel):
    items: List[TrendItem]
    total: int

class AlertAnalyticsResponse(BaseModel):
    total_alerts: int
    new_alerts: int
    acknowledged_alerts: int
    resolved_alerts: int
    severity_distribution: List[EventDistributionItem]
    camera_distribution: List[EventDistributionItem]
