import pytest
import numpy as np
from app.services.detector import Detector
from app.config import settings

def test_quality_metrics_dark():
    detector = Detector()
    # Create a completely black frame (very dark)
    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    
    metrics = detector.assess_image_quality(frame)
    assert "brightness" in metrics
    assert "blur_score" in metrics
    assert "quality_state" in metrics
    assert metrics["quality_state"] == "VERY_DARK"

def test_quality_metrics_normal():
    detector = Detector()
    # Create a gray frame (normal brightness, but flat so low blur score)
    frame = np.full((100, 100, 3), 128, dtype=np.uint8)
    
    metrics = detector.assess_image_quality(frame)
    # Brightness is 128, which is > LOW_LIGHT_BRIGHTNESS_THRESHOLD (50)
    # But blur is 0 (flat), so it should be BLURRY or LOW_CONTRAST
    assert metrics["quality_state"] in ["BLURRY", "LOW_CONTRAST"]
