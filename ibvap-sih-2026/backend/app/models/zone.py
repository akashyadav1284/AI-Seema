from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ZoneBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    zone_id: str = Field(..., min_length=1, max_length=50)
    camera_id: str = Field(..., min_length=1)
    zone_type: str = Field(..., pattern="^(RESTRICTED_ZONE|VIRTUAL_FENCE|LOITERING|WRONG_DIRECTION|CROWD)$")
    geometry: Dict[str, Any] = Field(..., description="Flexible geometry, e.g. {'polygon': [{'x':0.1,'y':0.1},...]} or {'point_a': {'x':0.1,'y':0.1}, 'point_b':...}")
    severity: str = Field(default="HIGH", pattern="^(LOW|MEDIUM|HIGH)$")
    active: bool = Field(default=True)
    config: Optional[Dict[str, Any]] = Field(default=None, description="Additional rule configs like threshold_seconds, prohibited_direction, min_people")

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    zone_type: Optional[str] = Field(None, pattern="^(RESTRICTED_ZONE|VIRTUAL_FENCE|LOITERING|WRONG_DIRECTION|CROWD)$")
    geometry: Optional[Dict[str, Any]] = None
    severity: Optional[str] = Field(None, pattern="^(LOW|MEDIUM|HIGH)$")
    active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None

class ZoneInDB(ZoneBase):
    created_at: datetime
    updated_at: datetime

class ZoneResponse(ZoneBase):
    created_at: datetime
    updated_at: datetime

class PaginatedZoneResponse(BaseModel):
    items: List[ZoneResponse]
    total: int
    skip: int
    limit: int
