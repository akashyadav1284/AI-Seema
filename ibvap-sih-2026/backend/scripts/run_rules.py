import argparse
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
from app.services.rule_engine import RuleEngine, VirtualFenceRule, RestrictedZoneRule, LoiteringRule, WrongDirectionRule, CrowdRule
from app.utils.annotation import Annotator

def main():
    parser = argparse.ArgumentParser(description="IBVAP Phase 4 CLI Rule Engine Runner")
    parser.add_argument("--source-type", choices=["webcam", "video", "rtsp"], default="video", help="Type of video source")
    parser.add_argument("--path", type=str, default="../data/videos/demo.mp4", help="Path to video file or webcam index")
    parser.add_argument("--save-output", action="store_true", help="Save the annotated video")
    parser.add_argument("--output-path", type=str, default="../data/videos/output_rules.mp4", help="Path to save annotated video")
    
    args = parser.parse_args()

    # Determine source value based on type
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

    # Add demo rules
    # Virtual Fence at x=100
    rule_engine.add_rule(VirtualFenceRule(
        rule_id="R1", 
        zone_id="FENCE-LEFT", 
        point_a={"x": 100, "y": 0}, 
        point_b={"x": 100, "y": int(video_service.height)}
    ))
    
    # Polygon Zone in center
    cx, cy = video_service.width // 2, video_service.height // 2
    polygon = [
        {"x": cx - 100, "y": cy - 100},
        {"x": cx + 100, "y": cy - 100},
        {"x": cx + 100, "y": cy + 100},
        {"x": cx - 100, "y": cy + 100}
    ]
    
    rule_engine.add_rule(RestrictedZoneRule(
        rule_id="R2",
        zone_id="CENTER-ZONE",
        polygon=polygon,
        trigger_on="ENTER"
    ))
    
    rule_engine.add_rule(LoiteringRule(
        rule_id="R3",
        zone_id="CENTER-ZONE",
        polygon=polygon,
        threshold_seconds=5 # Short for demo purposes
    ))
    
    rule_engine.add_rule(WrongDirectionRule(
        rule_id="R4",
        zone_id="CENTER-ZONE",
        prohibited_direction="RIGHT",
        polygon=polygon
    ))
    
    rule_engine.add_rule(CrowdRule(
        rule_id="R5",
        zone_id="CENTER-ZONE",
        polygon=polygon,
        min_people=2 # Small crowd for demo
    ))

    writer = None
    if args.save_output:
        os.makedirs(os.path.dirname(args.output_path), exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        fps = video_service.fps if video_service.fps > 0 else 30.0
        writer = cv2.VideoWriter(args.output_path, fourcc, fps, (video_service.width, video_service.height))
        print(f"Output will be saved to {args.output_path}")

    print("Starting rule engine processing. Press 'q' to stop.")

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
            
            if alerts:
                print(f"--- ALERTS AT FRAME {video_service.current_frame} ---")
                for a in alerts:
                    print(json.dumps(a, indent=2))
            
            # 4. Annotation
            frame = Annotator.draw_rules(frame, rule_engine.rules)
            annotated_frame = Annotator.draw_detections(frame, result, source_name=str(source))
            
            # Output
            if writer:
                writer.write(annotated_frame)
                
    except KeyboardInterrupt:
        print("Processing stopped by user.")
    finally:
        video_service.release()
        if writer:
            writer.release()
        print("Done.")

if __name__ == "__main__":
    main()
