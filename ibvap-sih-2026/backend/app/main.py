from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.utils.logger import logger
from app.routes import health, cameras, events, zones

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
