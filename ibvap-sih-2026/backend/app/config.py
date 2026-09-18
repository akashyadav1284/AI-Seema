from pydantic_settings import BaseSettings
from typing import List, Union

class Settings(BaseSettings):
    APP_NAME: str = "IBVAP"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "ibvap"
    
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:5173"]
    
    LOG_LEVEL: str = "INFO"

    # Phase 2: Video Intelligence Configuration
    VIDEO_FRAME_SKIP: int = 1
    RTSP_RECONNECT_RETRIES: int = 5
    RTSP_RECONNECT_DELAY: int = 5
    VIDEO_BUFFER_SIZE: int = 30
    
    YOLO_MODEL_PATH: str = "yolov8n.pt"
    YOLO_CONFIDENCE_THRESHOLD: float = 0.40
    YOLO_IOU_THRESHOLD: float = 0.45
    YOLO_IMAGE_SIZE: int = 640
    YOLO_DEVICE: str = "auto"
    YOLO_ALLOWED_CLASSES: List[int] = [0, 2, 3, 5, 7]
    
    LOW_LIGHT_BRIGHTNESS_THRESHOLD: float = 50.0
    VERY_DARK_BRIGHTNESS_THRESHOLD: float = 20.0
    LOW_CONTRAST_THRESHOLD: float = 30.0
    BLUR_THRESHOLD: float = 100.0

    # Phase 3: Object Tracking Configuration
    TRACKER_MAX_AGE: int = 30
    TRACKER_MIN_HITS: int = 3
    HISTORY_MAX_LENGTH: int = 50
    MOVEMENT_STATIONARY_THRESHOLD: float = 2.0
    
    # ByteTrack specific parameters
    TRACK_HIGH_THRESH: float = 0.5
    TRACK_LOW_THRESH: float = 0.1
    NEW_TRACK_THRESH: float = 0.6
    MATCH_THRESH: float = 0.8
    FUSE_SCORE: bool = True

    # Phase 4: Security Rule Engine Configuration
    ALERT_COOLDOWN_SECONDS: int = 60
    NIGHT_START_TIME: str = "18:00"
    NIGHT_END_TIME: str = "06:00"
    LOITERING_THRESHOLD_SECONDS: int = 60
    CROWD_MIN_PEOPLE: int = 5

    # Phase 5: Event Storage & Evidence
    EVIDENCE_DIR: str = "../data/evidence"

    class Config:
        env_file = ".env"

    def get_cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS

settings = Settings()
