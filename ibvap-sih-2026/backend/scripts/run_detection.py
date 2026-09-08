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
from app.utils.annotation import Annotator

def main():
    parser = argparse.ArgumentParser(description="IBVAP Phase 2 CLI Detection Runner")
    parser.add_argument("--source-type", choices=["webcam", "video", "rtsp"], default="video", help="Type of video source")
    parser.add_argument("--path", type=str, default=0, help="Path to video file or webcam index")
    parser.add_argument("--save-output", action="store_true", help="Save the annotated video")
    parser.add_argument("--output-path", type=str, default="../data/videos/output.mp4", help="Path to save annotated video")
    
    args = parser.parse_args()

    # Determine source value based on type
    source = int(args.path) if args.source_type == "webcam" else args.path

    # Initialize Services
    video_service = VideoService(source_type=args.source_type, source=source)
    if not video_service.open():
        print(f"Failed to open source: {source}")
        return

    detector = Detector()
    if not detector.initialize():
        print("Failed to initialize detector.")
        return

    writer = None
    if args.save_output:
        os.makedirs(os.path.dirname(args.output_path), exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        fps = video_service.fps if video_service.fps > 0 else 30.0
        writer = cv2.VideoWriter(args.output_path, fourcc, fps, (video_service.width, video_service.height))
        print(f"Output will be saved to {args.output_path}")

    print("Starting processing. Press 'q' to stop.")

    try:
        while True:
            ret, frame = video_service.read_frame()
            if not ret:
                break

            # Detection
            result = detector.detect(frame, frame_number=video_service.current_frame)
            
            # Annotation
            annotated_frame = Annotator.draw_detections(frame, result, source_name=str(source))
            
            # Output
            if writer:
                writer.write(annotated_frame)

            # Display to screen (Optional, depends on environment. We won't cv2.imshow to prevent GUI issues in docker/headless)
            # print(f"Frame: {result['frame_number']}, FPS: {result['fps']:.1f}, Detections: {len(result['detections'])}")
            
            if result['frame_number'] % 30 == 0:
                print(json.dumps(result, indent=2))
                
    except KeyboardInterrupt:
        print("Processing stopped by user.")
    finally:
        video_service.release()
        if writer:
            writer.release()
        print("Done.")

if __name__ == "__main__":
    main()
