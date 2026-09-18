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
