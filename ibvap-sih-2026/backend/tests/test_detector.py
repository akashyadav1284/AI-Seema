import pytest
import numpy as np
from app.services.detector import Detector

def test_detector_initialization():
    detector = Detector()
    # We will not test actual initialize() here if weights aren't downloaded,
    # but we can test the class structure and mapping.
    assert detector.device in ["auto", "cpu", "cuda"]
    assert 0 in detector.target_classes
    assert detector.target_classes[0] == "person"

def test_detect_uninitialized():
    detector = Detector()
    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    result = detector.detect(frame)
    assert "error" in result
    assert result["error"] == "Model not initialized"
