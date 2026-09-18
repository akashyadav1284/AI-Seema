import pytest
import os
import numpy as np
from unittest.mock import patch, MagicMock, AsyncMock

from app.services.event_service import EventService
from app.models.event import SecurityEvent

@pytest.fixture
def mock_db():
    with patch("app.services.event_service.is_db_connected", return_value=True), \
         patch("app.services.event_service.get_db") as mock_get_db:
        
        mock_db_instance = MagicMock()
        mock_collection = MagicMock()
        mock_collection.insert_one = AsyncMock(return_value=MagicMock(acknowledged=True))
        mock_db_instance.__getitem__.return_value = mock_collection
        mock_get_db.return_value = mock_db_instance
        
        yield mock_collection

def test_generate_event_id():
    service = EventService()
    event_id = service.generate_event_id()
    assert event_id.startswith("EVT-")
    assert len(event_id) > 10

def test_sanitize_event_id():
    service = EventService()
    bad_id = "../../etc/passwd"
    safe_id = service.sanitize_event_id(bad_id)
    assert ".." not in safe_id
    assert "/" not in safe_id
    assert safe_id == "etcpasswd"

def test_create_event_from_alert():
    service = EventService()
    alert = {
        "rule_id": "R1",
        "event_type": "VIRTUAL_FENCE",
        "severity": "HIGH",
        "camera_id": "cam_1",
        "track_id": 5,
        "object_type": "person",
        "zone_id": "Z1",
        "reason": "Crossed fence",
        "confidence": 0.95
    }
    
    event = service.create_event_from_alert(alert)
    assert isinstance(event, SecurityEvent)
    assert event.event_type == "VIRTUAL_FENCE"
    assert event.severity == "HIGH"
    assert event.track_id == 5
    assert event.status == "PENDING_REVIEW"
    assert event.snapshot_path is None # No frame provided
    assert event.event_id.startswith("EVT-")

@patch("cv2.imwrite")
@patch("cv2.rectangle")
@patch("cv2.putText")
def test_save_snapshot_with_bbox(mock_puttext, mock_rectangle, mock_imwrite):
    mock_imwrite.return_value = True
    service = EventService()
    dummy_frame = np.zeros((100, 100, 3), dtype=np.uint8)
    alert = {
        "event_type": "RESTRICTED_ZONE",
        "track_id": 1,
        "bbox": {"x1": 10, "y1": 10, "x2": 50, "y2": 50}
    }
    
    path = service.save_snapshot(dummy_frame, "EVT-TEST-123", alert)
    assert path is not None
    assert "EVT-TEST-123.jpg" in path
    
    # Ensure drawing functions were called
    mock_rectangle.assert_called_once()
    assert mock_puttext.call_count == 2 # 1 for label, 1 for overlay
    mock_imwrite.assert_called_once()

def test_malformed_alert_handling():
    service = EventService()
    
    # Missing required pydantic fields that normally crash
    alert = {}
    
    # Should safely fallback
    event = service.create_event_from_alert(alert)
    assert event is not None
    assert event.event_type == "UNKNOWN_ALERT"
    assert event.camera_id == "UNKNOWN_CAM"
    assert event.track_id == -1

@pytest.mark.anyio
async def test_save_event_to_db(mock_db):
    service = EventService()
    alert = {"event_type": "TEST", "reason": "test"}
    event = service.create_event_from_alert(alert)
    
    success = await service.save_event_to_db(event)
    assert success is True
    mock_db.insert_one.assert_called_once()
    
    # Verify arg
    called_arg = mock_db.insert_one.call_args[0][0]
    assert called_arg["event_id"] == event.event_id
    assert called_arg["status"] == "PENDING_REVIEW"
