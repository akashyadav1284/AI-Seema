import cv2
from app.services.video_service import VideoService, enhance_low_light
from app.services.detector import Detector
import time

# Global detector instance so we don't reload the model on every stream connection
detector = Detector()
detector.initialize()

def generate_annotated_frames(source):
    # Parse source type (simple logic: int vs str)
    try:
        source_val = int(source)
        source_type = "webcam"
    except ValueError:
        source_type = "rtsp" if str(source).startswith("rtsp") else "video"
        source_val = source

    video_service = VideoService(source_type=source_type, source=source_val)
    try:
        success = video_service.open()
        if not success:
            return

        frame_count = 0
        while True:
            ret, frame = video_service.read_frame()
            if not ret or frame is None:
                # If stream ends or fails, we break out
                break
            
            frame_count += 1
            
            # Optionally enhance
            enhanced = enhance_low_light(frame)
            
            # Run detection
            result = detector.detect(enhanced, frame_number=frame_count)
            detections = result.get("detections", [])
            
            # Draw bounding boxes and labels
            for det in detections:
                box = det["bbox"]
                x1, y1, x2, y2 = int(box["x1"]), int(box["y1"]), int(box["x2"]), int(box["y2"])
                label = f"{det['class_name']} {det['confidence']:.2f}"
                # Green box
                cv2.rectangle(enhanced, (x1, y1), (x2, y2), (0, 255, 0), 2)
                # White text
                cv2.putText(enhanced, label, (x1, max(y1 - 10, 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', enhanced)
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            # Yield MJPEG formatted bytes
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
    finally:
        # Always properly release the VideoService
        video_service.release()