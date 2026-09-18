import pytest
import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from jose import jwt

from app.main import app
from app.config import settings

client = TestClient(app)

def test_stream_without_token():
    response = client.get("/stream/cam123")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing token"

def test_stream_invalid_token():
    response = client.get("/stream/cam123?token=invalid.token.string")
    assert response.status_code == 401

def test_stream_malformed_token():
    response = client.get("/stream/cam123?token=just_random_garbage")
    assert response.status_code == 401

def test_stream_expired_token():
    to_encode = {"sub": "test@test.com"}
    expire = datetime.datetime.utcnow() - datetime.timedelta(minutes=15)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    response = client.get(f"/stream/cam123?token={token}")
    assert response.status_code == 401

@patch("app.main.get_ws_current_user", new_callable=AsyncMock)
@patch("app.main.camera_service.get_camera_by_id", new_callable=AsyncMock)
def test_stream_valid_authenticated_invalid_camera(mock_get_camera, mock_get_user):
    mock_get_user.return_value = {"email": "test@test.com", "is_active": True}
    mock_get_camera.return_value = None
    
    response = client.get("/stream/invalid_cam?token=valid_token")
    assert response.status_code == 404
    assert response.json()["detail"] == "Camera not found"

@patch("app.main.get_ws_current_user", new_callable=AsyncMock)
@patch("app.main.camera_service.get_camera_by_id", new_callable=AsyncMock)
@patch("app.main.generate_annotated_frames")
def test_stream_valid_camera_and_token(mock_generate, mock_get_camera, mock_get_user):
    mock_get_user.return_value = {"email": "test@test.com", "is_active": True}
    mock_get_camera.return_value = {"camera_id": "cam123", "name": "Cam 1"}
    
    async def mock_generator(*args, **kwargs):
        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\nfake_bytes\r\n"
        
    mock_generate.return_value = mock_generator()
    
    response = client.get("/stream/cam123?token=valid_token")
    assert response.status_code == 200
    assert "multipart/x-mixed-replace" in response.headers["content-type"]
