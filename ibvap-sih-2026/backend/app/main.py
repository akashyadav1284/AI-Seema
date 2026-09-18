from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from contextlib import asynccontextmanager
import socketio

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.utils.logger import logger
from app.routes import health, cameras, events, zones, evidence, auth, detections, ws, alerts, analytics
from app.services.stream_service import generate_annotated_frames

# Create Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

@sio.event
async def connect(sid, environ):
    logger.info(f"Socket.IO client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Socket.IO client disconnected: {sid}")

import asyncio
import time

# Queue to receive real events from stream_service
cv_event_queue = asyncio.Queue()

async def real_event_broadcaster():
    logger.info("Starting real AI/CV event broadcaster loop")
    while True:
        try:
            message_type, payload = await cv_event_queue.get()
            if message_type == "new_alert":
                await sio.emit('new_alert', payload)
            elif message_type == "tracks_update":
                await sio.emit('tracks_update', payload)
            elif message_type == "stats_update":
                await sio.emit('stats_update', payload)
        except Exception as e:
            logger.error(f"Error broadcasting event: {e}")
        finally:
            cv_event_queue.task_done()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting IBVAP Backend")
    await connect_to_mongo()
    global background_task
    background_task = asyncio.create_task(mock_realtime_data_loop())
    yield
    # Shutdown
    logger.info("Shutting down IBVAP Backend")
    if background_task:
        background_task.cancel()
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
async def stream(camera_id: str):
    return StreamingResponse(
        generate_annotated_frames(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

# Mount Socket.IO app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
app = socket_app  # Override app to serve Socket.IO
