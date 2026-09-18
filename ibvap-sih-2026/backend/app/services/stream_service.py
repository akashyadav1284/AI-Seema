import cv2
import json
import httpx
from starlette.concurrency import run_in_threadpool
from app.services.video_service import VideoService, enhance_low_light
from app.services.detector import Detector
from app.services.tracker import TrackerService
from app.services.config_service import ConfigService
from app.routes.auth import create_access_token
from app.models.detection import DetectionPayload, TrackedDetection
from app.config import settings
import time

# Global detector instance so we don't reload the model on every stream connection
detector = Detector()
detector.initialize()

async def generate_annotated_frames(camera_id: str):
    # Dynamically fetch camera configuration
    camera_config = await ConfigService.get_camera_config(camera_id)
    
    if camera_config:
        source_type = camera_config.get("source_type", "video")
        source_val = camera_config.get("source", 0)
        # Parse int if it's a webcam source stored as string "0"
        if source_type == "webcam" and isinstance(source_val, str) and source_val.isdigit():
            source_val = int(source_val)
    else:
        # Fallback for local development without populated DB
        try:
            source_val = int(camera_id)
            source_type = "webcam"
        except ValueError:
            source_type = "rtsp" if str(camera_id).startswith("rtsp") else "video"
            source_val = camera_id

    video_service = VideoService(source_type=source_type, source=source_val)
    tracker = TrackerService(camera_id=camera_id)
    
    # Dynamically fetch zones and fences for annotation only
    zones = await ConfigService.get_zones(camera_id)
    fences = await ConfigService.get_fences(camera_id)
    
    # Internal token for AI service to authenticate to POST /api/detections
    internal_token = create_access_token(data={"sub": "system_ai_service", "role": "admin"})

    try:
        success = await run_in_threadpool(video_service.open)
        if not success:
            return
            
        video_service.start()

        frame_count = 0
        while True:
            ret, frame = await run_in_threadpool(video_service.read_frame)
            if not ret:
                break
            if frame is None:
                continue
            
            frame_count += 1
            
            if frame_count % settings.VIDEO_FRAME_SKIP != 0:
                continue
            
            enhanced = await run_in_threadpool(enhance_low_light, frame)
            result = await run_in_threadpool(detector.detect, enhanced, frame_number=frame_count)
            tracks = await run_in_threadpool(tracker.update, result)
            
            # Post to Backend (Decoupled Architecture)
            ret, buffer = await run_in_threadpool(cv2.imencode, '.jpg', enhanced)
            if ret and len(tracks) > 0:
                frame_bytes = buffer.tobytes()
                
                tracked_detections = []
                for t in tracks:
                    tracked_detections.append(TrackedDetection(
                        track_id=t["track_id"],
                        class_name=t["class_name"],
                        confidence=t["confidence"],
                        bbox={"x1": t["bbox"]["x1"], "y1": t["bbox"]["y1"], "x2": t["bbox"]["x2"], "y2": t["bbox"]["y2"]},
                        centroid={"x": t["centroid"]["x"], "y": t["centroid"]["y"]},
                        previous_centroid={"x": t.get("previous_centroid", {}).get("x", 0), "y": t.get("previous_centroid", {}).get("y", 0)} if t.get("previous_centroid") else None,
                        active=t["active"],
                        movement_state=t["movement_state"],
                        direction=t["direction"]
                    ))
                
                payload = DetectionPayload(
                    camera_id=camera_id,
                    timestamp=time.time(),
                    frame_number=frame_count,
                    tracks=tracked_detections
                )
                
                async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
                    try:
                        await client.post(
                            "/api/detections/",
                            headers={"Authorization": f"Bearer {internal_token}"},
                            data={"payload": payload.model_dump_json()},
                            files={"frame": ("frame.jpg", frame_bytes, "image/jpeg")}
                        )
                    except Exception as e:
                        print(f"Error posting to detections API: {e}")
            
            # Annotate tracking
            for track in tracks:
                box = track["bbox"]
                x1, y1, x2, y2 = int(box["x1"]), int(box["y1"]), int(box["x2"]), int(box["y2"])
                label = f"ID:{track['track_id']} {track['class_name']} {track['confidence']:.2f}"
                cv2.rectangle(enhanced, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(enhanced, label, (x1, max(y1 - 10, 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Annotate rules directly from config
            if zones:
                for z in zones:
                    poly = z.get("polygon", [])
                    if len(poly) >= 3:
                        for i in range(len(poly)):
                            p1 = poly[i]
                            p2 = poly[(i + 1) % len(poly)]
                            cv2.line(enhanced, (int(p1["x"]), int(p1["y"])), (int(p2["x"]), int(p2["y"])), (0, 0, 255), 2)
            else:
                # Fallback for testing
                sample_polygon = [{"x": 100.0, "y": 100.0}, {"x": 500.0, "y": 100.0}, {"x": 500.0, "y": 400.0}, {"x": 100.0, "y": 400.0}]
                for i in range(len(sample_polygon)):
                    p1 = sample_polygon[i]
                    p2 = sample_polygon[(i + 1) % len(sample_polygon)]
                    cv2.line(enhanced, (int(p1["x"]), int(p1["y"])), (int(p2["x"]), int(p2["y"])), (0, 0, 255), 2)

            if fences:
                for f in fences:
                    line = f.get("line", [])
                    if len(line) == 2:
                        p1, p2 = line[0], line[1]
                        cv2.line(enhanced, (int(p1["x"]), int(p1["y"])), (int(p2["x"]), int(p2["y"])), (255, 0, 0), 2)
            
            if ret:
                frame_bytes = buffer.tobytes()
            else:
                ret, buffer = await run_in_threadpool(cv2.imencode, '.jpg', enhanced)
                if not ret:
                    continue
                frame_bytes = buffer.tobytes()
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
    finally:
        await run_in_threadpool(video_service.release)