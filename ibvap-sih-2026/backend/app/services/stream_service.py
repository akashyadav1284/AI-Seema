import cv2
from starlette.concurrency import run_in_threadpool
from app.services.video_service import VideoService, enhance_low_light
from app.services.detector import Detector
from app.services.tracker import TrackerService
from app.services.rule_engine import RuleEngine, RestrictedZoneRule, VirtualFenceRule
from app.services.event_service import EventService
from app.services.config_service import ConfigService
from app.config import settings
import time

# Global detector instance so we don't reload the model on every stream connection
detector = Detector()
detector.initialize()

# Global event service
event_service = EventService()

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
    rule_engine = RuleEngine(camera_id=camera_id)
    
    # Dynamically fetch zones
    zones = await ConfigService.get_zones(camera_id)
    if zones:
        for z in zones:
            polygon = z.get("polygon", [])
            if len(polygon) >= 3:
                rule_engine.add_rule(RestrictedZoneRule(
                    rule_id=str(z.get("_id", z.get("zone_id", "UNKNOWN"))),
                    zone_id=z.get("zone_id", "UNKNOWN"),
                    polygon=polygon,
                    trigger_on="ENTER",
                    target_classes=z.get("object_classes", ["person", "car", "truck", "motorcycle"])
                ))
    else:
        # Fallback rule for testing
        sample_polygon = [{"x": 100.0, "y": 100.0}, {"x": 500.0, "y": 100.0}, {"x": 500.0, "y": 400.0}, {"x": 100.0, "y": 400.0}]
        rule_engine.add_rule(RestrictedZoneRule(rule_id="RULE-001", zone_id="ZONE-001", polygon=sample_polygon, trigger_on="ENTER"))

    # Dynamically fetch fences
    fences = await ConfigService.get_fences(camera_id)
    if fences:
        for f in fences:
            line = f.get("line", [])
            if len(line) == 2:
                rule_engine.add_rule(VirtualFenceRule(
                    rule_id=str(f.get("_id", f.get("fence_id", "UNKNOWN"))),
                    zone_id=f.get("fence_id", "UNKNOWN"),
                    line=line,
                    trigger_on="CROSS",
                    target_classes=f.get("object_classes", ["person", "car", "truck", "motorcycle"])
                ))

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
            alerts = await run_in_threadpool(rule_engine.evaluate, tracks)
            
            for alert in alerts:
                event = await run_in_threadpool(event_service.create_event_from_alert, alert, enhanced)
                await event_service.save_event_to_db(event)
            
            # Annotate tracking
            for track in tracks:
                box = track["bbox"]
                x1, y1, x2, y2 = int(box["x1"]), int(box["y1"]), int(box["x2"]), int(box["y2"])
                label = f"ID:{track['track_id']} {track['class_name']} {track['confidence']:.2f}"
                cv2.rectangle(enhanced, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(enhanced, label, (x1, max(y1 - 10, 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Annotate rules from rule engine directly
            for rule in rule_engine.rules:
                if isinstance(rule, RestrictedZoneRule):
                    poly = rule.polygon
                    for i in range(len(poly)):
                        p1 = poly[i]
                        p2 = poly[(i + 1) % len(poly)]
                        cv2.line(enhanced, (int(p1["x"]), int(p1["y"])), (int(p2["x"]), int(p2["y"])), (0, 0, 255), 2)
                elif isinstance(rule, VirtualFenceRule):
                    line = rule.line
                    if len(line) == 2:
                        p1, p2 = line[0], line[1]
                        cv2.line(enhanced, (int(p1["x"]), int(p1["y"])), (int(p2["x"]), int(p2["y"])), (255, 0, 0), 2)
            
            ret, buffer = await run_in_threadpool(cv2.imencode, '.jpg', enhanced)
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
    finally:
        await run_in_threadpool(video_service.release)