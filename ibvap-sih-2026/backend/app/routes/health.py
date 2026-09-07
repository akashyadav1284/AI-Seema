from fastapi import APIRouter, status
from app.database import is_db_connected
from app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    db_status = "connected" if is_db_connected() else "disconnected"
    system_status = "healthy" if db_status == "connected" else "degraded"
    
    return {
        "status": system_status,
        "service": settings.APP_NAME.lower() + "-backend",
        "version": "0.1.0",
        "database": db_status
    }
