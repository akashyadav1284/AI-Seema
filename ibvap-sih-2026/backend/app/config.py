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
    YOLO_MODEL_PATH: str = "yolov8n.pt"
    YOLO_CONFIDENCE_THRESHOLD: float = 0.40
    YOLO_IMAGE_SIZE: int = 640
    YOLO_DEVICE: str = "auto"
    
    LOW_LIGHT_BRIGHTNESS_THRESHOLD: float = 50.0
    VERY_DARK_BRIGHTNESS_THRESHOLD: float = 20.0
    LOW_CONTRAST_THRESHOLD: float = 30.0
    BLUR_THRESHOLD: float = 100.0

    # Phase 3: Object Tracking Configuration
    TRACKER_MAX_AGE: int = 30
    TRACKER_MIN_HITS: int = 3
    HISTORY_MAX_LENGTH: int = 50
    MOVEMENT_STATIONARY_THRESHOLD: float = 2.0

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
