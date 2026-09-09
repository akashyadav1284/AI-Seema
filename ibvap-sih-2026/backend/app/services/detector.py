
import cv2
import numpy as np
from typing import Dict, Any, List, Optional
from ultralytics import YOLO
import time

from app.config import settings
from app.utils.logger import logger

class Detector:
    def __init__(self):
        self.model_path = settings.YOLO_MODEL_PATH
        self.confidence_threshold = settings.YOLO_CONFIDENCE_THRESHOLD
        self.device = settings.YOLO_DEVICE
        self.model: Optional[YOLO] = None
        
        # Mapping standard YOLOv8 COCO classes to our target classes
        # 0: person, 2: car, 3: motorcycle, 5: bus, 7: truck
        self.target_classes = {
            0: "person",
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck"
        }

    def initialize(self) -> bool:
        try:
            logger.info(f"Loading YOLO model from {self.model_path} on device {self.device}")
            # If auto, let ultralytics figure it out, else pass device
            device_arg = None if self.device == "auto" else self.device
            self.model = YOLO(self.model_path)
            if device_arg:
                self.model.to(device_arg)
            logger.info("YOLO model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            return False

    def assess_image_quality(self, frame: np.ndarray) -> Dict[str, Any]:
        """Basic image quality assessment (brightness, blur)"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Brightness (mean pixel value)
        brightness = np.mean(gray)
        
        # Blur (variance of Laplacian)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Contrast (standard deviation of pixel values)
        contrast = np.std(gray)
        
        quality_state = "NORMAL"
        if brightness < settings.VERY_DARK_BRIGHTNESS_THRESHOLD:
            quality_state = "VERY_DARK"
        elif brightness < settings.LOW_LIGHT_BRIGHTNESS_THRESHOLD:
            quality_state = "LOW_LIGHT"
        elif blur_score < settings.BLUR_THRESHOLD:
            quality_state = "BLURRY"
        elif contrast < settings.LOW_CONTRAST_THRESHOLD:
            quality_state = "LOW_CONTRAST"
            
        return {
            "brightness": float(brightness),
            "contrast": float(contrast),
            "blur_score": float(blur_score),
            "quality_state": quality_state
        }

    def detect(self, frame: np.ndarray, frame_number: int = 0) -> Dict[str, Any]:
        if self.model is None:
            logger.error("Detector not initialized")
            return {"error": "Model not initialized", "detections": []}

        start_time = time.perf_counter()
        
        # Quality assessment
        quality_metrics = self.assess_image_quality(frame)
        
        # Inference
        results = self.model.predict(
            source=frame,
            conf=self.confidence_threshold,
            classes=list(self.target_classes.keys()),
            imgsz=settings.YOLO_IMAGE_SIZE,
            verbose=False
        )
        
        process_time = time.perf_counter() - start_time
        fps = 1.0 / process_time if process_time > 0 else 0.0

        detections = []
        
        if len(results) > 0:
            result = results[0]
            boxes = result.boxes
            
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                
                # Validation and clamping
                height, width = frame.shape[:2]
                x1 = max(0, min(x1, width))
                x2 = max(0, min(x2, width))
                y1 = max(0, min(y1, height))
                y2 = max(0, min(y2, height))
                
                if x1 >= x2 or y1 >= y2:
                    continue
                    
                center_x = (x1 + x2) / 2.0
                center_y = (y1 + y2) / 2.0
                
                class_name = self.target_classes.get(cls_id, "unknown")
                
                detections.append({
                    "class_id": cls_id,
                    "class_name": class_name,
                    "confidence": conf,
                    "bbox": {
                        "x1": float(x1),
                        "y1": float(y1),
                        "x2": float(x2),
                        "y2": float(y2)
                    },
                    "centroid": {
                        "x": float(center_x),
                        "y": float(center_y)
                    }
                })

        return {
            "frame_number": frame_number,
            "timestamp": time.time(),
            "process_time": process_time,
            "fps": fps,
            "frame_quality": quality_metrics,
            "detections": detections
        }
