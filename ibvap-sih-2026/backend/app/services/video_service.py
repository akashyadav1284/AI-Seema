import cv2
from typing import Optional, Dict, Any, Tuple
from app.utils.logger import logger

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

    def open(self) -> bool:
        logger.info(f"Attempting to open video source: {self.source_type} -> {self.source}")
        
        try:
            if self.source_type == "webcam":
                self.capture = cv2.VideoCapture(int(self.source))
            elif self.source_type in ["video", "rtsp"]:
                self.capture = cv2.VideoCapture(self.source)
            else:
                logger.error(f"Unsupported source type: {self.source_type}")
                return False

            if not self.capture or not self.capture.isOpened():
                logger.error(f"Failed to open video source: {self.source}")
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

    def read_frame(self) -> Tuple[bool, Optional[Any]]:
        if not self.is_opened or not self.capture:
            return False, None
            
        ret, frame = self.capture.read()
        if ret:
            self.current_frame += 1
            return True, frame
        else:
            return False, None

    def release(self):
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
