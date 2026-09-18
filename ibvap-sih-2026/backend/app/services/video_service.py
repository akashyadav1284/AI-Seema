import cv2
import numpy as np
from typing import Optional, Dict, Any, Tuple
from app.utils.logger import logger
import time
import threading
import queue
from app.config import settings

import re

def _mask_url(url: Any) -> str:
    if isinstance(url, str):
        # Mask rtsp://user:password@ip -> rtsp://user:***@ip
        return re.sub(r'(rtsp://[^:]+:)[^@]+(@.*)', r'\1***\2', url)
    return str(url)

class VideoService:
    def __init__(self, source_type: str, source: Any):
        self.source_type = source_type
        self.source = source
        self.capture: Optional[cv2.VideoCapture] = None
        
        self.width = 0
        self.height = 0
        self.fps = 0.0
        self.total_frames = 0
        self.current_frame = 0
        self.is_opened = False
        
        self.frame_queue = queue.Queue(maxsize=settings.VIDEO_BUFFER_SIZE)
        self._stop_event = threading.Event()
        self._reader_thread = None

    def open(self) -> bool:
        safe_source = _mask_url(self.source)
        logger.info(f"Attempting to open video source: {self.source_type} -> {safe_source}")
        
        try:
            if self.source_type == "webcam":
                self.capture = cv2.VideoCapture(int(self.source))
            elif self.source_type in ["video", "rtsp"]:
                self.capture = cv2.VideoCapture(self.source)
            else:
                logger.error(f"Unsupported source type: {self.source_type}")
                return False

            if not self.capture or not self.capture.isOpened():
                logger.error(f"Failed to open video source: {_mask_url(self.source)}")
                return False

            self.width = int(self.capture.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.height = int(self.capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
            self.fps = self.capture.get(cv2.CAP_PROP_FPS)
            self.total_frames = int(self.capture.get(cv2.CAP_PROP_FRAME_COUNT))
            self.is_opened = True

            logger.info(f"Successfully opened source. Resolution: {self.width}x{self.height}, FPS: {self.fps}")
            return True
        except Exception as e:
            logger.error(f"Exception opening video source: {e}")
            return False

    def start(self):
        """Starts the background frame reader thread."""
        if not self.is_opened:
            return
        self._stop_event.clear()
        self._reader_thread = threading.Thread(target=self._update, daemon=True)
        self._reader_thread.start()

    def _reconnect(self) -> bool:
        """Attempts to reconnect to an RTSP stream."""
        if self.source_type != "rtsp":
            return False
            
        logger.warning(f"Connection lost. Reconnecting to RTSP: {_mask_url(self.source)}")
        if self.capture:
            self.capture.release()
            self.capture = None
            self.is_opened = False
            
        for attempt in range(1, settings.RTSP_RECONNECT_RETRIES + 1):
            if self._stop_event.is_set():
                break
            logger.info(f"RTSP Reconnect attempt {attempt}/{settings.RTSP_RECONNECT_RETRIES}")
            if self.open():
                logger.info("Successfully reconnected to RTSP stream.")
                return True
            time.sleep(settings.RTSP_RECONNECT_DELAY)
            
        logger.error("Failed to reconnect to RTSP stream after all attempts.")
        return False

    def _update(self):
        while not self._stop_event.is_set():
            if not self.is_opened or not self.capture:
                time.sleep(0.1)
                continue
                
            ret, frame = self.capture.read()
            if not ret or frame is None or frame.size == 0:
                if self.source_type == "rtsp":
                    if not self._reconnect():
                        self._stop_event.set()
                        break
                    continue
                else:
                    # For video files or webcam, we just stop on EOF or failure
                    self._stop_event.set()
                    break
                    
            # If queue is full, drop the oldest frame to avoid latency
            if self.frame_queue.full():
                try:
                    self.frame_queue.get_nowait()
                except queue.Empty:
                    pass
            self.frame_queue.put(frame)

    def read_frame(self) -> Tuple[bool, Optional[Any]]:
        """Reads the next available frame from the background queue."""
        if not self.is_opened and self.frame_queue.empty():
            return False, None
            
        try:
            # We use a short timeout to periodically check if the thread stopped
            # (e.g. video ended) instead of blocking forever.
            frame = self.frame_queue.get(timeout=0.1)
            self.current_frame += 1
            return True, frame
        except queue.Empty:
            if self._stop_event.is_set():
                return False, None
            # Return true with None if we're just waiting for a frame on a live stream
            # The caller should ignore it and continue.
            return True, None

    def release(self):
        self._stop_event.set()
        if self._reader_thread:
            self._reader_thread.join(timeout=1.0)
            
        # Flush queue
        while not self.frame_queue.empty():
            try:
                self.frame_queue.get_nowait()
            except queue.Empty:
                break
                
        if self.capture:
            logger.info("Releasing video source")
            self.capture.release()
            self.is_opened = False
            self.capture = None

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type,
            "width": self.width,
            "height": self.height,
            "fps": self.fps,
            "total_frames": self.total_frames,
            "current_frame": self.current_frame,
            "is_opened": self.is_opened
        }

def enhance_low_light(frame: np.ndarray) -> np.ndarray:
    # Convert to LAB
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    # CLAHE on L channel
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l)

    # Merge back and convert to BGR
    lab_enhanced = cv2.merge((l_enhanced, a, b))
    enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)

    # Gamma correction
    gamma = 1.2
    inv_gamma = 1.0 / gamma
    table = ((np.arange(256) / 255.0) ** inv_gamma) * 255
    enhanced = cv2.LUT(enhanced, table.astype("uint8"))

    return enhanced
