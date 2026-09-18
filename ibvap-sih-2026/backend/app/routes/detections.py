from fastapi import APIRouter, HTTPException, Depends, status
from app.models.detection import DetectionPayload, DetectionResponse
from app.services.auth import RoleChecker
from app.services.detection_service import detection_service
from app.database import is_db_connected
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Detections"])

@router.post("/", response_model=DetectionResponse, status_code=status.HTTP_201_CREATED)
async def submit_detections(
    payload: DetectionPayload,
    current_user: dict = Depends(RoleChecker(["admin", "operator"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        result = await detection_service.process_payload(payload)
        return DetectionResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to process detection payload: {e}")
        raise HTTPException(status_code=500, detail="Internal processing error")
