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

valid_payload = {
    "camera_id": "CAM-01",
    "timestamp": 1695029300.0,
    "frame_number": 120,
    "tracks": [
        {
            "track_id": 42,
            "class_name": "person",
            "confidence": 0.85,
            "bbox": {"x1": 100.5, "y1": 200.0, "x2": 150.0, "y2": 400.0},
            "centroid": {"x": 125.25, "y": 300.0},
            "active": True,
            "movement_state": "MOVING",
            "direction": "NORTH",
            "previous_centroid": {"x": 125.0, "y": 310.0}
        }
    ]
}

@patch("app.routes.detections.is_db_connected", return_value=True)
@patch("app.services.camera_service.get_camera_by_id", new_callable=AsyncMock)
@patch("app.services.detection_service.zone_service.list_zones", new_callable=AsyncMock)
@patch("app.services.detection_service.EventService.save_event_to_db", new_callable=AsyncMock)
def test_submit_detections_success(mock_save_event, mock_list_zones, mock_get_camera, mock_db_conn):
    mock_get_camera.return_value = {"camera_id": "CAM-01", "status": "active"}
    mock_list_zones.return_value = ([], 0) # No zones -> No events generated
    
    response = client.post("/api/detections/", json=valid_payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["events_generated"] == 0

@patch("app.routes.detections.is_db_connected", return_value=True)
@patch("app.services.camera_service.get_camera_by_id", new_callable=AsyncMock)
def test_submit_detections_invalid_camera(mock_get_camera, mock_db_conn):
    mock_get_camera.return_value = None
    
    response = client.post("/api/detections/", json=valid_payload)
    
    assert response.status_code == 400
    assert "Unknown camera_id" in response.json()["detail"]

@patch("app.routes.detections.is_db_connected", return_value=True)
@patch("app.services.camera_service.get_camera_by_id", new_callable=AsyncMock)
def test_submit_detections_inactive_camera(mock_get_camera, mock_db_conn):
    mock_get_camera.return_value = {"camera_id": "CAM-01", "status": "inactive"}
    
    response = client.post("/api/detections/", json=valid_payload)
    
    assert response.status_code == 400
    assert "is not active" in response.json()["detail"]

def test_submit_detections_invalid_payload():
    invalid_payload = {
        "camera_id": "CAM-01",
        "timestamp": 1695029300.0,
        "frame_number": 120,
        "tracks": [
            {
                "track_id": 42,
                "class_name": "person",
                "confidence": 1.5, # Invalid confidence > 1.0
                "bbox": {"x1": 100.5, "y1": 200.0, "x2": 150.0, "y2": 400.0},
                "centroid": {"x": 125.25, "y": 300.0},
            }
        ]
    }
    
    response = client.post("/api/detections/", json=invalid_payload)
    assert response.status_code == 422 # Validation error

def test_rbac_viewer_cannot_submit():
    app.dependency_overrides[get_current_user] = lambda: {"email": "viewer@test.com", "role": "viewer"}
    
    response = client.post("/api/detections/", json=valid_payload)
    assert response.status_code == 403
