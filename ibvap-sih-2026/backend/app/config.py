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

    class Config:
        env_file = ".env"

    def get_cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS

settings = Settings()
