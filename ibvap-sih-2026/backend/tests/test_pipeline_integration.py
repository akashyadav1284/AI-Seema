import pytest
import cv2
import numpy as np
from app.services.detector import Detector
from app.services.tracker import TrackerService
from app.services.rule_engine import RuleEngine, RestrictedZoneRule
from app.services.event_service import EventService

def test_pipeline_integration():
    """
    Simulates the AI pipeline flow to verify components can communicate.
    Detector -> Tracker -> RuleEngine -> EventService
    """
    # 1. Setup mock frame
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    # Draw something that looks like a person to standard models (though we'll mock detector output here)
    cv2.rectangle(frame, (200, 200), (300, 400), (255, 255, 255), -1)

    # 2. Setup components
    # We won't actually run YOLO, we will mock the detector output
    # but we will run the actual Tracker, RuleEngine, and EventService.
    tracker = TrackerService(camera_id="test_cam")
    rule_engine = RuleEngine(camera_id="test_cam")
    event_service = EventService()

    # Add a restricted zone that our mocked person is inside
    polygon = [{"x": 100.0, "y": 100.0}, {"x": 400.0, "y": 100.0}, {"x": 400.0, "y": 500.0}, {"x": 100.0, "y": 500.0}]
    rule_engine.add_rule(RestrictedZoneRule(rule_id="RULE-TEST-1", zone_id="ZONE-TEST-1", polygon=polygon, trigger_on="INSIDE"))

    # 3. Create mock detection output
    mock_detection = {
        "timestamp": 1690000000.0,
        "detections": [
            {
                "class_id": 0,
                "class_name": "person",
                "confidence": 0.95,
                "bbox": {"x1": 200.0, "y1": 200.0, "x2": 300.0, "y2": 400.0},
                "centroid": {"x": 250.0, "y": 300.0}
            }
        ]
    }

    # 4. Pipeline Step 1: Tracking
    tracks = tracker.update(mock_detection)
    
    # Assert track created
    assert len(tracks) > 0
    track = tracks[0]
    assert track["class_name"] == "person"
    assert track["track_id"] > 0

    # 5. Pipeline Step 2: Rule Engine
    alerts = rule_engine.evaluate(tracks)
    
    # Assert rule triggered
    assert len(alerts) > 0
    alert = alerts[0]
    assert alert["rule_id"] == "RULE-TEST-1"
    assert alert["zone_id"] == "ZONE-TEST-1"
    assert alert["triggered"] is True

    # 6. Pipeline Step 3: Event Service
    # Create the event (we don't save to DB in this test to avoid MongoDB requirement)
    event = event_service.create_event_from_alert(alert, frame)
    
    # Assert event formatted correctly
    assert event.event_type == "RESTRICTED_ZONE"
    assert event.camera_id == "test_cam"
    assert event.track_id == track["track_id"]
    assert event.snapshot_path is not None
    assert event.snapshot_path.endswith(".jpg")
