import pytest
import numpy as np
from unittest.mock import MagicMock, patch
from app.services.detector import Detector

def test_detector_initialization():
    detector = Detector()
    assert detector.device in ["auto", "cpu", "cuda"]
    assert 0 in detector.target_classes
    assert detector.target_classes[0] == "person"
    assert detector.iou_threshold == 0.45

def test_detect_uninitialized():
    detector = Detector()
    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    result = detector.detect(frame)
    assert "error" in result
    assert result["error"] == "Model not initialized"

def test_detect_invalid_frame():
    detector = Detector()
    detector.model = MagicMock()
    
    # None frame
    result = detector.detect(None)
    assert "error" in result
    assert result["error"] == "Invalid frame"
    
    # Empty array
    result = detector.detect(np.array([]))
    assert "error" in result
    assert result["error"] == "Invalid frame"

@patch('app.services.detector.YOLO')
def test_detect_inference_success(mock_yolo_class):
    detector = Detector()
    # Assign a mock model directly
    mock_model = MagicMock()
    detector.model = mock_model
    
    # Mocking YOLO output
    class MockBox:
        def __init__(self, xyxy, conf, cls):
            self.xyxy = xyxy
            self.conf = conf
            self.cls = cls
            
    class MockResult:
        def __init__(self, boxes):
            self.boxes = boxes
            
    # Mock boxes: [x1, y1, x2, y2], conf, cls
    mock_box = MockBox(
        xyxy=np.array([[10, 10, 50, 50]]),
        conf=np.array([0.9]),
        cls=np.array([0]) # person
    )
    mock_model.predict.return_value = [MockResult([mock_box])]
    
    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    result = detector.detect(frame)
    
    assert "error" not in result
    assert len(result["detections"]) == 1
    det = result["detections"][0]
    assert det["class_id"] == 0
    assert det["class_name"] == "person"
    assert det["confidence"] == 0.9
    assert det["centroid"]["x"] == 30.0
    assert det["centroid"]["y"] == 30.0
    assert det["bbox"]["x1"] == 10.0
    assert det["bbox"]["x2"] == 50.0

@patch('app.services.detector.YOLO')
def test_detect_empty_detections(mock_yolo_class):
    detector = Detector()
    mock_model = MagicMock()
    detector.model = mock_model
    
    class MockResult:
        def __init__(self, boxes):
            self.boxes = boxes
            
    mock_model.predict.return_value = [MockResult([])]
    
    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    result = detector.detect(frame)
    
    assert "error" not in result
    assert len(result["detections"]) == 0

@patch('app.services.detector.YOLO')
def test_detect_inference_failure(mock_yolo_class):
    detector = Detector()
    mock_model = MagicMock()
    detector.model = mock_model
    
    # Force exception
    mock_model.predict.side_effect = Exception("CUDA error")
    
    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    result = detector.detect(frame)
    
    assert "error" in result
    assert result["error"] == "Inference failed"
