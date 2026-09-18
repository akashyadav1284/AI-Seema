import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock

from app.main import app
from app.services.auth import get_current_user

# Mock auth for normal access
@pytest.fixture(autouse=True)
def override_auth():
    # Provide admin for testing creates/updates
    app.dependency_overrides[get_current_user] = lambda: {"email": "test@example.com", "role": "admin"}
    yield
    app.dependency_overrides = {}

client = TestClient(app)

@pytest.fixture
def mock_db():
    with patch("app.routes.cameras.is_db_connected", return_value=True), \
         patch("app.services.camera_service.get_db") as mock_get_db:
        db_instance = MagicMock()
        mock_get_db.return_value = db_instance
        yield db_instance

def test_create_camera_success(mock_db):
    mock_db["cameras"].find_one = AsyncMock(return_value=None)
    mock_db["cameras"].insert_one = AsyncMock()
    
    response = client.post("/api/cameras/", json={
        "name": "Front Gate",
        "camera_id": "CAM-01",
        "source_type": "webcam",
        "source": "0"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Front Gate"
    assert data["camera_id"] == "CAM-01"

def test_create_camera_duplicate(mock_db):
    mock_db["cameras"].find_one = AsyncMock(return_value={"camera_id": "CAM-01"})
    
    response = client.post("/api/cameras/", json={
        "name": "Front Gate",
        "camera_id": "CAM-01",
        "source_type": "webcam",
        "source": "0"
    })
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Camera ID already exists"

def test_rbac_viewer_cannot_create_camera(mock_db):
    app.dependency_overrides[get_current_user] = lambda: {"email": "viewer@test.com", "role": "viewer"}
    
    response = client.post("/api/cameras/", json={
        "name": "Front Gate",
        "camera_id": "CAM-02",
        "source_type": "webcam",
        "source": "0"
    })
    
    assert response.status_code == 403
