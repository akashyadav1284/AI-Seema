import cv2
import time
from app.services.video_service import VideoService, enhance_low_light
from app.services.detector import Detector

def draw_detections(frame, detections):
    for d in detections:
        x1, y1, x2, y2 = map(int, d["bbox"])
        label = f"{d['label']} {d['conf']:.2f}"
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    return frame

def main():
    vs = VideoService(0)  # 0 = webcam
    vs.open_stream()
    detector = Detector()

    prev_time = time.time()
    fps = 0.0

    while True:
        frame = vs.read_frame()
        if frame is None:
            break

        detections = detector.detect(frame)
        annotated = draw_detections(frame, detections)

        # FPS
        curr_time = time.time()
        fps = 1.0 / (curr_time - prev_time) if curr_time - prev_time > 0 else 0.0
        prev_time = curr_time
        cv2.putText(annotated, f"FPS: {fps:.1f}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        cv2.imshow("IBVAP Live", annotated)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    vs.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()