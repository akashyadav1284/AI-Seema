import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

from app.main import app
from app.services.auth import get_current_user

client = TestClient(app)

@pytest.fixture
def mock_admin_user():
    app.dependency_overrides[get_current_user] = lambda: {"email": "admin@test.com", "role": "admin"}
    yield
    app.dependency_overrides = {}

@pytest.fixture
def mock_no_user():
    app.dependency_overrides = {}

@patch("app.routes.analytics.is_db_connected", return_value=True)
@patch("app.services.analytics_service.get_db")
def test_get_summary_empty(mock_get_db, mock_is_db, mock_admin_user):
    mock_db = MagicMock()
    mock_cameras = MagicMock()
    mock_events = MagicMock()
    mock_alerts = MagicMock()
    mock_db.__getitem__.side_effect = lambda k: {"cameras": mock_cameras, "events": mock_events, "alerts": mock_alerts}.get(k, MagicMock())
    
    mock_cameras.count_documents = AsyncMock(return_value=0)
    mock_events.count_documents = AsyncMock(return_value=0)
    mock_alerts.count_documents = AsyncMock(return_value=0)
    mock_get_db.return_value = mock_db
    
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_cameras"] == 0
    assert data["active_cameras"] == 0
    assert data["total_events"] == 0

@patch("app.routes.analytics.is_db_connected", return_value=True)
@patch("app.services.analytics_service.get_db")
def test_get_summary_populated(mock_get_db, mock_is_db, mock_admin_user):
    mock_db = MagicMock()
    mock_cameras = MagicMock()
    mock_events = MagicMock()
    mock_alerts = MagicMock()
    mock_db.__getitem__.side_effect = lambda k: {"cameras": mock_cameras, "events": mock_events, "alerts": mock_alerts}.get(k, MagicMock())
    
    async def mock_count_documents(filter):
        if "status" in filter and filter["status"] == "active":
            return 2
        return 5
        
    mock_cameras.count_documents = AsyncMock(side_effect=mock_count_documents)
    mock_events.count_documents = AsyncMock(return_value=100)
    mock_alerts.count_documents = AsyncMock(return_value=10)
    mock_get_db.return_value = mock_db
    
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_cameras"] == 5
    assert data["active_cameras"] == 2
    assert data["total_events"] == 100
    assert data["total_alerts"] == 10

@patch("app.routes.analytics.is_db_connected", return_value=True)
@patch("app.services.analytics_service.get_db")
def test_get_event_analytics_empty(mock_get_db, mock_is_db, mock_admin_user):
    mock_db = MagicMock()
    mock_events = MagicMock()
    mock_db.__getitem__.return_value = mock_events
    
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])
    mock_events.aggregate.return_value = mock_cursor
    mock_get_db.return_value = mock_db
    
    response = client.get("/api/analytics/events")
    assert response.status_code == 200
    data = response.json()
    assert data["by_type"] == []
    assert data["by_severity"] == []
    assert data["by_camera"] == []

@patch("app.routes.analytics.is_db_connected", return_value=True)
@patch("app.services.analytics_service.get_db")
def test_get_event_analytics_populated(mock_get_db, mock_is_db, mock_admin_user):
    mock_db = MagicMock()
    mock_events = MagicMock()
    mock_db.__getitem__.return_value = mock_events
    
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[
        {
            "by_type": [{"_id": "person", "count": 5}],
            "by_severity": [{"_id": "HIGH", "count": 2}],
            "by_camera": [{"_id": "cam_1", "count": 10}]
        }
    ])
    mock_events.aggregate.return_value = mock_cursor
    mock_get_db.return_value = mock_db
    
    response = client.get("/api/analytics/events?camera_id=cam_1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["by_type"]) == 1
    assert data["by_type"][0]["name"] == "person"
    assert data["by_type"][0]["count"] == 5

@patch("app.routes.analytics.is_db_connected", return_value=True)
def test_get_event_analytics_invalid_time(mock_is_db, mock_admin_user):
    response = client.get("/api/analytics/events?start_time=200&end_time=100")
    assert response.status_code == 400
    assert "start_time cannot be greater than end_time" in response.json()["detail"]

@patch("app.routes.analytics.is_db_connected", return_value=True)
@patch("app.services.analytics_service.get_db")
def test_get_trends_valid(mock_get_db, mock_is_db, mock_admin_user):
    mock_db = MagicMock()
    mock_events = MagicMock()
    mock_db.__getitem__.return_value = mock_events
    
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[
        {"_id": 1704067200, "count": 5},
        {"_id": 1704153600, "count": 10}
    ])
    mock_events.aggregate.return_value = mock_cursor
    mock_get_db.return_value = mock_db
    
    response = client.get("/api/analytics/events/trends?start_time=1704067200&end_time=1704153600&interval=day")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 15
    assert len(data["items"]) == 2
    
@patch("app.routes.analytics.is_db_connected", return_value=True)
@patch("app.services.analytics_service.get_db")
def test_get_alert_analytics(mock_get_db, mock_is_db, mock_admin_user):
    mock_db = MagicMock()
    mock_alerts = MagicMock()
    mock_db.__getitem__.return_value = mock_alerts
    
    mock_alerts.count_documents = AsyncMock(return_value=1)
    
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[
        {
            "by_severity": [{"_id": "HIGH", "count": 1}],
            "by_camera": [{"_id": "cam_1", "count": 1}]
        }
    ])
    mock_alerts.aggregate.return_value = mock_cursor
    mock_get_db.return_value = mock_db
    
    response = client.get("/api/analytics/alerts")
    assert response.status_code == 200
    data = response.json()
    assert data["total_alerts"] == 1
    assert data["severity_distribution"][0]["name"] == "HIGH"

def test_unauthenticated_access(mock_no_user):
    response = client.get("/api/analytics/summary")
    assert response.status_code == 401
