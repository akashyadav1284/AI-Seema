import argparse
import asyncio
import cv2
import json
import sys
import os
from pathlib import Path

# Add the backend root to the path so app can be imported
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.services.video_service import VideoService
from app.services.detector import Detector
from app.services.tracker import TrackerService
from app.services.rule_engine import RuleEngine, VirtualFenceRule, RestrictedZoneRule
from app.services.event_service import EventService
from app.utils.annotation import Annotator
from app.database import connect_to_mongo, close_mongo_connection

async def main():
    parser = argparse.ArgumentParser(description="IBVAP Phase 5 Part 1 CLI Event Storage Runner")
    parser.add_argument("--source-type", choices=["webcam", "video", "rtsp"], default="video", help="Type of video source")
    parser.add_argument("--path", type=str, default="../data/videos/demo.mp4", help="Path to video file or webcam index")
    parser.add_argument("--save-output", action="store_true", help="Save the annotated video")
    parser.add_argument("--output-path", type=str, default="../data/videos/output_events.mp4", help="Path to save annotated video")
    
    args = parser.parse_args()

    # Connect to MongoDB
    await connect_to_mongo()

    source = int(args.path) if args.source_type == "webcam" else args.path

    video_service = VideoService(source_type=args.source_type, source=source)
    if not video_service.open():
        print(f"Failed to open source: {source}")
        return

    detector = Detector()
    if not detector.initialize():
        print("Failed to initialize detector.")
        return

    tracker = TrackerService(camera_id=str(source))
    rule_engine = RuleEngine(camera_id=str(source))
    event_service = EventService()

    # Add demo rules
    rule_engine.add_rule(VirtualFenceRule(
        rule_id="R1", 
        zone_id="FENCE-LEFT", 
        point_a={"x": 100, "y": 0}, 
        point_b={"x": 100, "y": int(video_service.height)}
    ))
    
    cx, cy = video_service.width // 2, video_service.height // 2
    polygon = [
        {"x": cx - 100, "y": cy - 100},
        {"x": cx + 100, "y": cy - 100},
        {"x": cx + 100, "y": cy + 100},
        {"x": cx - 100, "y": cy + 100}
    ]
    rule_engine.add_rule(RestrictedZoneRule(rule_id="R2", zone_id="CENTER-ZONE", polygon=polygon, trigger_on="ENTER"))

    writer = None
    if args.save_output:
        os.makedirs(os.path.dirname(args.output_path), exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        fps = video_service.fps if video_service.fps > 0 else 30.0
        writer = cv2.VideoWriter(args.output_path, fourcc, fps, (video_service.width, video_service.height))
        print(f"Output will be saved to {args.output_path}")

    print("Starting event engine processing. Press 'q' to stop.")

    try:
        while True:
            ret, frame = video_service.read_frame()
            if not ret:
                break

            # 1. Detection
            result = detector.detect(frame, frame_number=video_service.current_frame)
            
            # 2. Tracking
            active_tracks = tracker.update(result)
            result["detections"] = active_tracks
            
            # 3. Rules
            alerts = rule_engine.evaluate(active_tracks)
            result["alerts"] = alerts
            
            # 4. Annotation
            frame_to_save = Annotator.draw_rules(frame, rule_engine.rules)
            annotated_frame = Annotator.draw_detections(frame_to_save, result, source_name=str(source))
            
            # 5. Events & Evidence
            if alerts:
                print(f"--- ALERTS AT FRAME {video_service.current_frame} ---")
                for a in alerts:
                    # Create event and capture snapshot (using annotated_frame for context)
                    event = event_service.create_event_from_alert(a, annotated_frame)
                    print(f"Generated Event: {event.event_id} -> Snapshot: {event.snapshot_path}")
                    
                    # Save to MongoDB
                    success = await event_service.save_event_to_db(event)
                    print(f"Saved to DB: {success}")
            
            # Output
            if writer:
                writer.write(annotated_frame)
                
    except KeyboardInterrupt:
        print("Processing stopped by user.")
    finally:
        video_service.release()
        if writer:
            writer.release()
        await close_mongo_connection()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(main())
