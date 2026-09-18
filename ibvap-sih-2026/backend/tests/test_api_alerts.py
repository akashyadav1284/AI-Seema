import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

from app.main import app
from app.services.auth import get_current_user
from app.models.event import SecurityEvent

client = TestClient(app)

@pytest.fixture
def mock_admin_user():
    app.dependency_overrides[get_current_user] = lambda: {"email": "admin@test.com", "role": "admin"}
    yield
    app.dependency_overrides = {}

@pytest.fixture
def mock_viewer_user():
    app.dependency_overrides[get_current_user] = lambda: {"email": "viewer@test.com", "role": "viewer"}
    yield
    app.dependency_overrides = {}

# Test Alert Creation
@pytest.mark.anyio
@patch("app.services.alert_service.get_db")
@patch("app.services.alert_service.is_db_connected", return_value=True)
@patch("app.services.websocket_manager.websocket_manager.broadcast_alert", new_callable=AsyncMock)
async def test_process_event_high_severity(mock_broadcast, mock_db_conn, mock_get_db):
    from app.services.alert_service import alert_service
    
    mock_db = MagicMock()
    mock_db["alerts"].insert_one = AsyncMock()
    mock_get_db.return_value = mock_db
    
    event = SecurityEvent(
        event_id="EVT-1", event_type="VIRTUAL_FENCE", severity="HIGH",
        camera_id="CAM-1", timestamp=123.0, object_type="person",
        track_id=1, confidence=0.9, zone_id="Z1", reason="Test"
    )
    
    await alert_service.process_event(event)
    
    assert mock_db["alerts"].insert_one.call_count == 1
    # Check broadcast was called (create_task runs it in background, so we await small sleep if needed, but in mock it might not await properly without a small sleep)
    import asyncio
    await asyncio.sleep(0.01)
    assert mock_broadcast.call_count == 1

@pytest.mark.anyio
@patch("app.services.alert_service.get_db")
@patch("app.services.alert_service.is_db_connected", return_value=True)
async def test_process_event_low_severity_ignored(mock_db_conn, mock_get_db):
    from app.services.alert_service import alert_service
    
    mock_db = MagicMock()
    mock_db["alerts"].insert_one = AsyncMock()
    mock_get_db.return_value = mock_db
    
    event = SecurityEvent(
        event_id="EVT-2", event_type="NOISE", severity="LOW",
        camera_id="CAM-1", timestamp=123.0, object_type="person",
        track_id=1, confidence=0.9, zone_id="Z1", reason="Test"
    )
    
    await alert_service.process_event(event)
    
    assert mock_db["alerts"].insert_one.call_count == 0

# Test API Endpoints
@patch("app.routes.alerts.alert_service.get_alerts", new_callable=AsyncMock)
@patch("app.routes.alerts.is_db_connected", return_value=True)
def test_list_alerts(mock_db_conn, mock_get_alerts, mock_admin_user):
    mock_get_alerts.return_value = ([], 0)
    response = client.get("/api/alerts/")
    assert response.status_code == 200
    assert response.json()["items"] == []

@patch("app.routes.alerts.alert_service.update_alert_status", new_callable=AsyncMock)
@patch("app.routes.alerts.is_db_connected", return_value=True)
def test_acknowledge_alert_admin(mock_db_conn, mock_update_status, mock_admin_user):
    mock_update_status.return_value = {"alert_id": "ALT-1", "status": "ACKNOWLEDGED", "event_id": "E", "camera_id": "C", "alert_type": "T", "severity": "S", "message": "M", "created_at": 1.0}
    response = client.patch("/api/alerts/ALT-1/acknowledge")
    assert response.status_code == 200
    assert response.json()["status"] == "ACKNOWLEDGED"

def test_acknowledge_alert_viewer(mock_viewer_user):
    response = client.patch("/api/alerts/ALT-1/acknowledge")
    assert response.status_code == 403

@patch("app.routes.alerts.alert_service.update_alert_status", new_callable=AsyncMock)
@patch("app.routes.alerts.is_db_connected", return_value=True)
def test_resolve_alert_admin(mock_db_conn, mock_update_status, mock_admin_user):
    mock_update_status.return_value = {"alert_id": "ALT-1", "status": "RESOLVED", "event_id": "E", "camera_id": "C", "alert_type": "T", "severity": "S", "message": "M", "created_at": 1.0}
    response = client.patch("/api/alerts/ALT-1/resolve")
    assert response.status_code == 200
    assert response.json()["status"] == "RESOLVED"

@patch("app.routes.alerts.alert_service.update_alert_status", new_callable=AsyncMock)
@patch("app.routes.alerts.is_db_connected", return_value=True)
def test_invalid_lifecycle_transition(mock_db_conn, mock_update_status, mock_admin_user):
    mock_update_status.side_effect = ValueError("Cannot acknowledge alert from state RESOLVED")
    response = client.patch("/api/alerts/ALT-1/acknowledge")
    assert response.status_code == 400
    assert "Cannot acknowledge" in response.json()["detail"]
