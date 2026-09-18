from fastapi import APIRouter, HTTPException, Depends, status, File, UploadFile, Form
from pydantic import ValidationError
from app.models.detection import DetectionPayload, DetectionResponse
from app.services.auth import RoleChecker
from app.services.detection_service import detection_service
from app.database import is_db_connected
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Detections"])

@router.post("/", response_model=DetectionResponse, status_code=status.HTTP_201_CREATED)
async def submit_detections(
    payload: str = Form(...),
    frame: UploadFile = File(None),
    current_user: dict = Depends(RoleChecker(["admin", "operator"]))
):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        payload_data = DetectionPayload.model_validate_json(payload)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    frame_bytes = None
    if frame:
        frame_bytes = await frame.read()

    try:
        result = await detection_service.process_payload(payload_data, frame_bytes)
        return DetectionResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to process detection payload: {e}")
        raise HTTPException(status_code=500, detail="Internal processing error")
