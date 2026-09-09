from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.utils.logger import logger
from app.routes import health, cameras, events, zones, evidence
from app.services.stream_service import generate_annotated_frames

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting IBVAP Backend")
    await connect_to_mongo()
    yield
    # Shutdown
    logger.info("Shutting down IBVAP Backend")
    await close_mongo_connection()

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered intelligent video analytics platform for border surveillance and security event detection.",
    version="0.1.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred."
            }
        }
    )

# Routes
app.include_router(health.router, prefix="/api")
app.include_router(cameras.router, prefix="/api/cameras")
app.include_router(events.router, prefix="/api/events")
app.include_router(zones.router, prefix="/api/zones")
app.include_router(evidence.router, prefix="/api/evidence")

@app.get("/stream/{camera_id}")
async def stream(camera_id: str):
    # For demo, mapping camera_id "0" to webcam source 0
    # source can be an int or string. Let's pass 0 if "0" else the string.
    source = 0 if camera_id == "0" else camera_id
    
    return StreamingResponse(
        generate_annotated_frames(source),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
