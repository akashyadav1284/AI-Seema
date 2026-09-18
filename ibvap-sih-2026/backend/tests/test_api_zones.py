import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock

from app.main import app
from app.services.auth import get_current_user

@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: {"email": "test@example.com", "role": "admin"}
    yield
    app.dependency_overrides = {}

client = TestClient(app)

@pytest.fixture
def mock_db():
    with patch("app.routes.zones.is_db_connected", return_value=True), \
         patch("app.services.zone_service.get_db") as mock_get_db:
        db_instance = MagicMock()
        mock_get_db.return_value = db_instance
        yield db_instance

def test_create_zone_success(mock_db):
    mock_db["zones"].find_one = AsyncMock(return_value=None)
    mock_db["zones"].insert_one = AsyncMock()
    
    # Mock camera lookup in zone_service
    with patch("app.services.zone_service.get_camera_by_id", return_value={"camera_id": "CAM-01"}):
        response = client.post("/api/zones/", json={
            "name": "Restricted Area",
            "zone_id": "ZONE-01",
            "camera_id": "CAM-01",
            "zone_type": "RESTRICTED_ZONE",
            "geometry": {"polygon": [{"x": 10.0, "y": 10.0}]}
        })
        
    assert response.status_code == 201
    assert response.json()["zone_id"] == "ZONE-01"

def test_create_zone_invalid_camera(mock_db):
    mock_db["zones"].find_one = AsyncMock(return_value=None) 
    
    with patch("app.services.zone_service.get_camera_by_id", return_value=None):
        response = client.post("/api/zones/", json={
            "name": "Restricted Area",
            "zone_id": "ZONE-01",
            "camera_id": "MISSING-CAM",
            "zone_type": "RESTRICTED_ZONE",
            "geometry": {"polygon": [{"x": 10.0, "y": 10.0}]}
        })
        
    assert response.status_code == 400
    assert "Referenced camera does not exist" in response.json()["detail"]

def test_rbac_viewer_cannot_create_zone(mock_db):
    app.dependency_overrides[get_current_user] = lambda: {"email": "v@t.com", "role": "viewer"}
    
    response = client.post("/api/zones/", json={
        "name": "Restricted Area",
        "zone_id": "ZONE-01",
        "camera_id": "CAM-01",
        "zone_type": "RESTRICTED_ZONE",
        "geometry": {}
    })
    
    assert response.status_code == 403
