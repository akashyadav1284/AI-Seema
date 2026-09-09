import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock

from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_db():
    with patch("app.routes.events.is_db_connected", return_value=True), \
         patch("app.routes.events.get_db") as mock_get_db:
        
        mock_db_instance = MagicMock()
        mock_collection = MagicMock()
        mock_db_instance.__getitem__.return_value = mock_collection
        mock_get_db.return_value = mock_db_instance
        
        yield mock_collection

def test_get_events_list(mock_db):
    mock_db.count_documents = AsyncMock(return_value=1)
    
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.skip.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=[{
        "event_id": "EVT-1",
        "event_type": "TEST",
        "severity": "HIGH",
        "camera_id": "cam_1",
        "timestamp": 12345.0,
        "object_type": "person",
        "track_id": 1,
        "confidence": 0.9,
        "zone_id": "Z1",
        "status": "PENDING_REVIEW",
        "reason": "test"
    }])
    mock_db.find.return_value = mock_cursor
    
    response = client.get("/api/events/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["event_id"] == "EVT-1"

def test_get_event_by_id(mock_db):
    mock_db.find_one = AsyncMock(return_value={
        "event_id": "EVT-1",
        "event_type": "TEST",
        "severity": "HIGH",
        "camera_id": "cam_1",
        "timestamp": 12345.0,
        "object_type": "person",
        "track_id": 1,
        "confidence": 0.9,
        "zone_id": "Z1",
        "status": "PENDING_REVIEW",
        "reason": "test"
    })
    
    response = client.get("/api/events/EVT-1")
    assert response.status_code == 200
    assert response.json()["event_id"] == "EVT-1"

def test_get_event_by_id_not_found(mock_db):
    mock_db.find_one = AsyncMock(return_value=None)
    response = client.get("/api/events/EVT-MISSING")
    assert response.status_code == 404

def test_review_event(mock_db):
    mock_db.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    mock_db.find_one = AsyncMock(return_value={
        "event_id": "EVT-1",
        "event_type": "TEST",
        "severity": "HIGH",
        "camera_id": "cam_1",
        "timestamp": 12345.0,
        "object_type": "person",
        "track_id": 1,
        "confidence": 0.9,
        "zone_id": "Z1",
        "status": "VERIFIED",
        "reason": "test"
    })
    
    response = client.patch("/api/events/EVT-1/review", json={"status": "VERIFIED", "notes": "Looks good"})
    assert response.status_code == 200
    assert response.json()["status"] == "VERIFIED"

def test_review_event_invalid_status(mock_db):
    response = client.patch("/api/events/EVT-1/review", json={"status": "HACKED"})
    assert response.status_code == 400

def test_get_evidence_path_traversal():
    response = client.get("/api/evidence/snapshots/..%2F..%2Fetc%2Fpasswd")
    assert response.status_code in [400, 404]
