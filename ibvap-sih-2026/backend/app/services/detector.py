from ultralytics import YOLO
import numpy as np

class Detector:
    def __init__(self, model_name: str = "yolov8n.pt"):
        self.model = YOLO(model_name)
        self.classes_of_interest = ["person", "car", "motorcycle", "bus", "truck"]

    def detect(self, frame: np.ndarray):
        results = self.model(frame, verbose=False)
        r = results[0]
        detections = []

        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0].cpu().numpy())
            cls_id = int(box.cls[0].cpu().numpy())
            label = self.model.names[cls_id]

            if label not in self.classes_of_interest:
                continue

            centroid_x = (x1 + x2) / 2.0
            centroid_y = (y1 + y2) / 2.0

            detections.append({
                "label": label,
                "conf": conf,
                "bbox": [float(x1), float(y1), float(x2), float(y2)],
                "centroid": [float(centroid_x), float(centroid_y)],
            })

        return detections