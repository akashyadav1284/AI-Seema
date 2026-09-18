from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CameraBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    camera_id: str = Field(..., min_length=1, max_length=50)
    source_type: str = Field(..., pattern="^(webcam|video|rtsp)$")
    source: str = Field(..., min_length=1)
    location: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    status: str = Field(default="active", pattern="^(active|inactive|offline)$")
    enabled: bool = Field(default=True)

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    source_type: Optional[str] = Field(None, pattern="^(webcam|video|rtsp)$")
    source: Optional[str] = Field(None, min_length=1)
    location: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = Field(None, pattern="^(active|inactive|offline)$")
    enabled: Optional[bool] = None

class CameraInDB(CameraBase):
    created_at: datetime
    updated_at: datetime

class CameraResponse(CameraBase):
    created_at: datetime
    updated_at: datetime

class PaginatedCameraResponse(BaseModel):
    items: List[CameraResponse]
    total: int
    skip: int
    limit: int
