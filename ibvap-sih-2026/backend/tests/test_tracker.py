import pytest
from app.services.tracker import TrackerService

def test_tracker_initialization():
    tracker = TrackerService(camera_id="cam_1")
    assert tracker.camera_id == "cam_1"
    assert len(tracker.tracks) == 0

def test_tracker_update_new_detection():
    tracker = TrackerService(camera_id="cam_1")
    # Make tracker return tracks immediately for testing instead of waiting for MIN_HITS
    tracker.min_hits = 1 
    
    detection_result = {
        "timestamp": 100.0,
        "detections": [
            {
                "class_id": 0,
                "class_name": "person",
                "confidence": 0.9,
                "bbox": {"x1": 10, "y1": 10, "x2": 50, "y2": 50},
                "centroid": {"x": 30, "y": 30}
            }
        ]
    }
    
    tracks = tracker.update(detection_result)
    assert len(tracks) == 1
    assert tracks[0]["track_id"] == 1
    assert tracks[0]["class_name"] == "person"
    assert tracks[0]["movement_state"] == "UNKNOWN" or tracks[0]["movement_state"] == "STATIONARY"
    assert len(tracks[0]["trajectory"]) == 1

def test_tracker_persistent_id():
    tracker = TrackerService(camera_id="cam_1")
    tracker.min_hits = 1
    
    # Frame 1
    tracker.update({
        "timestamp": 100.0,
        "detections": [{"class_id": 0, "class_name": "person", "confidence": 0.9, 
                        "bbox": {"x1": 10, "y1": 10, "x2": 50, "y2": 50}, "centroid": {"x": 30, "y": 30}}]
    })
    
    # Frame 2 (Object moved slightly)
    tracks = tracker.update({
        "timestamp": 101.0,
        "detections": [{"class_id": 0, "class_name": "person", "confidence": 0.9, 
                        "bbox": {"x1": 12, "y1": 12, "x2": 52, "y2": 52}, "centroid": {"x": 32, "y": 32}}]
    })
    
    assert len(tracks) == 1
    assert tracks[0]["track_id"] == 1 # ID must persist!
    assert tracks[0]["hits"] == 2
    assert len(tracks[0]["trajectory"]) == 2
    assert tracks[0]["movement_vector"]["dx"] == 2.0
    assert tracks[0]["movement_vector"]["dy"] == 2.0

def test_tracker_isolation():
    tracker1 = TrackerService(camera_id="cam_1")
    tracker2 = TrackerService(camera_id="cam_2")
    
    tracker1.min_hits = 1
    tracker2.min_hits = 1
    
    det = {
        "timestamp": 100.0,
        "detections": [{"class_id": 0, "class_name": "person", "confidence": 0.9, 
                        "bbox": {"x1": 10, "y1": 10, "x2": 50, "y2": 50}, "centroid": {"x": 30, "y": 30}}]
    }
    
    t1 = tracker1.update(det)
    t2 = tracker2.update(det)
    
    assert t1[0]["track_id"] == 1
    assert t2[0]["track_id"] == 1
    assert t1[0]["camera_id"] == "cam_1"
    assert t2[0]["camera_id"] == "cam_2"
    
    # Prove they are completely separate instances
    t1_updated = tracker1.update(det)
    assert t1_updated[0]["hits"] == 2
    assert t2[0]["hits"] == 1

def test_tracker_movement_direction():
    tracker = TrackerService(camera_id="cam_1")
    tracker.min_hits = 1
    
    # Frame 1
    tracker.update({
        "timestamp": 100.0,
        "detections": [{"class_id": 0, "class_name": "person", "confidence": 0.9, 
                        "bbox": {"x1": 10, "y1": 10, "x2": 50, "y2": 50}, "centroid": {"x": 30, "y": 30}}]
    })
    
    # Frame 2 (Move right by 10 pixels)
    tracks = tracker.update({
        "timestamp": 101.0,
        "detections": [{"class_id": 0, "class_name": "person", "confidence": 0.9, 
                        "bbox": {"x1": 20, "y1": 10, "x2": 60, "y2": 50}, "centroid": {"x": 40, "y": 30}}]
    })
    
    assert tracks[0]["movement_state"] == "MOVING"
    assert tracks[0]["direction"] == "RIGHT"
    assert tracks[0]["duration"] == 1.0

def test_tracker_inactive_state():
    tracker = TrackerService(camera_id="cam_1")
    tracker.min_hits = 1
    tracker.max_age = 2 # Short age for testing
    
    # Frame 1
    tracker.update({
        "timestamp": 100.0,
        "detections": [{"class_id": 0, "class_name": "person", "confidence": 0.9, 
                        "bbox": {"x1": 10, "y1": 10, "x2": 50, "y2": 50}, "centroid": {"x": 30, "y": 30}}]
    })
    
    # Miss frame 2
    tracks = tracker.update({"timestamp": 101.0, "detections": []})
    assert len(tracks) == 1
    assert tracks[0]["active"] is True
    
    # Miss frame 3
    tracks = tracker.update({"timestamp": 102.0, "detections": []})
    assert len(tracks) == 1
    assert tracks[0]["active"] is True
    
    # Miss frame 4 (exceeds max_age of 2)
    tracks = tracker.update({"timestamp": 103.0, "detections": []})
    # The track should be returned one last time with active=False
    assert len(tracks) == 1
    assert tracks[0]["active"] is False
    
    # Miss frame 5 (track should be flushed)
    tracks = tracker.update({"timestamp": 104.0, "detections": []})
    assert len(tracks) == 0

