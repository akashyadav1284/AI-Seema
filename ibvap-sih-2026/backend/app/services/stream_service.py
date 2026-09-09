import cv2
from app.services.video_service import VideoService
from app.services.detector import Detector

# Global detector instance so we don't reload the model on every stream connection
detector = Detector()

def generate_annotated_frames(source):
    video_service = VideoService(source)
    try:
        video_service.open_stream()
        while True:
            frame = video_service.read_frame()
            if frame is None:
                # If stream ends or fails, we break out
                break
                
            # Run detection
            detections = detector.detect(frame)
            
            # Draw bounding boxes and labels
            for det in detections:
                x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
                label = f"{det['label']} {det['conf']:.2f}"
                # Green box
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                # White text
                cv2.putText(frame, label, (x1, max(y1 - 10, 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            # Yield MJPEG formatted bytes
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
    finally:
        # Always properly release the VideoService
        video_service.release()