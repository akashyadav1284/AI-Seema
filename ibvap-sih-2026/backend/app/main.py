from fastapi import FastAPI, Request, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from contextlib import asynccontextmanager


from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.utils.logger import logger
from app.routes import health, cameras, events, zones, evidence, auth, detections, ws, alerts, analytics
from app.services.stream_service import generate_annotated_frames
from app.routes.ws import get_ws_current_user
from app.services import camera_service



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

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

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
app.include_router(auth.router, prefix="/api/auth")
app.include_router(cameras.router, prefix="/api/cameras")
app.include_router(events.router, prefix="/api/events")
app.include_router(zones.router, prefix="/api/zones")
app.include_router(evidence.router, prefix="/api/evidence")
app.include_router(detections.router, prefix="/api/detections")
app.include_router(ws.router, prefix="/api/ws")
app.include_router(alerts.router, prefix="/api/alerts")
app.include_router(analytics.router)

@app.get("/stream/{camera_id}")
async def stream(camera_id: str, token: str = Query(None)):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = await get_ws_current_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Check camera authorization
    camera = await camera_service.get_camera_by_id(camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found"
        )
        
    return StreamingResponse(
        generate_annotated_frames(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

