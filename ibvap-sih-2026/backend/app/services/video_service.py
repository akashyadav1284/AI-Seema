import cv2
import numpy as np
import time

class VideoService:
    def __init__(self, source):
        """
        source: int (webcam index) or str (RTSP URL / video file path)
        """
        self.source = source
        self.cap = None
        self.fps = 0.0
        self.last_frame_time = 0.0

    def open_stream(self):
        self.cap = cv2.VideoCapture(self.source)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open video source: {self.source}")
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 0.0

    def read_frame(self):
        if self.cap is None:
            return None
        ret, frame = self.cap.read()
        if not ret:
            return None
        self.last_frame_time = time.time()
        enhanced = enhance_low_light(frame)
        return enhanced

    def release(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None

    def get_health(self):
        online = self.cap is not None and self.cap.isOpened()
        return {
            "online": online,
            "fps": self.fps,
            "last_frame_time": self.last_frame_time,
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