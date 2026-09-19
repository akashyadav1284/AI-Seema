import pytest
import time
from app.services.video_service import VideoService

def test_invalid_video_path():
    service = VideoService(source_type="video", source="invalid/path/to/video.mp4")
    assert service.open() is False
    assert service.is_opened is False

def test_unsupported_source_type():
    service = VideoService(source_type="unsupported", source="something")
    assert service.open() is False
    assert service.is_opened is False

def test_webcam_failure_graceful():
    # Attempting to open an invalid index should fail gracefully without crashing
    service = VideoService(source_type="webcam", source=9999)
    assert service.open() is False
    assert service.is_opened is False

def test_start_stop_thread():
    service = VideoService(source_type="video", source="dummy")
    service.start()
    assert service._reader_thread is None  # Shouldn't start if not opened
    service.release()

def test_read_frame_empty():
    service = VideoService(source_type="video", source="dummy")
    ret, frame = service.read_frame()
    assert ret is False
    assert frame is None

from unittest.mock import patch, MagicMock

def test_rtsp_source_handling():
    # Mock cv2.VideoCapture to avoid actual network call
    mock_capture = MagicMock()
    mock_capture.isOpened.return_value = True
    with patch('cv2.VideoCapture', return_value=mock_capture):
        service = VideoService(source_type="rtsp", source="rtsp://10.28.45.143:554/stream")
        assert service.open() is True
        assert service.is_opened is True
    
    # Test masked url logic
    from app.services.video_service import _mask_url
    assert _mask_url("rtsp://admin:pass123@10.28.45.143/stream") == "rtsp://admin:***@10.28.45.143/stream"

