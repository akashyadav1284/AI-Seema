import argparse
import asyncio
import cv2
import json
import sys
import time
from pathlib import Path
import httpx

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.services.video_service import VideoService
from app.services.detector import Detector
from app.services.tracker import TrackerService
from app.models.detection import DetectionPayload

API_URL = "http://localhost:8000/api"

async def authenticate(email, password):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{API_URL}/auth/login",
                data={"username": email, "password": password}
            )
            response.raise_for_status()
            return response.json()["access_token"]
        except Exception as e:
            print(f"Failed to authenticate: {e}")
            return None

async def main():
    parser = argparse.ArgumentParser(description="AI/CV to FastAPI Integration Script")
    parser.add_argument("--source-type", choices=["webcam", "video", "rtsp"], default="video")
    parser.add_argument("--path", type=str, default="../data/videos/demo.mp4")
    parser.add_argument("--camera-id", type=str, required=True, help="Registered MongoDB camera ID")
    parser.add_argument("--email", type=str, default="admin@example.com")
    parser.add_argument("--password", type=str, default="admin")
    
    args = parser.parse_args()

    token = await authenticate(args.email, args.password)
    if not token:
        print("Exiting due to authentication failure.")
        return

    source = int(args.path) if args.source_type == "webcam" else args.path
    video_service = VideoService(source_type=args.source_type, source=source)
    if not video_service.open():
        print(f"Failed to open source: {source}")
        return

    video_service.start()

    detector = Detector()
    if not detector.initialize():
        print("Failed to initialize detector.")
        return

    tracker = TrackerService(camera_id=args.camera_id)

    print(f"Started pipeline for camera {args.camera_id}. Press Ctrl+C to stop.")

    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {token}"}
            while True:
                ret, frame = video_service.read_frame()
                if not ret:
                    break
                if frame is None:
                    continue

                timestamp = time.time()
                result = detector.detect(frame, frame_number=video_service.current_frame)
                active_tracks = tracker.update(result)

                if not active_tracks:
                    continue

                # Prepare JSON payload
                payload = DetectionPayload(
                    camera_id=args.camera_id,
                    timestamp=timestamp,
                    frame_number=video_service.current_frame,
                    tracks=active_tracks
                )

                # Encode frame to JPEG
                success, encoded_image = cv2.imencode('.jpg', frame)
                if not success:
                    print("Failed to encode frame")
                    continue

                # Send multipart request
                files = {
                    "payload": (None, payload.model_dump_json(), "application/json"),
                    "frame": ("frame.jpg", encoded_image.tobytes(), "image/jpeg")
                }

                try:
                    resp = await client.post(f"{API_URL}/detections/", files=files, headers=headers)
                    if resp.status_code == 201:
                        data = resp.json()
                        if data.get("events_generated", 0) > 0:
                            print(f"Frame {video_service.current_frame}: Generated {data['events_generated']} events")
                    else:
                        print(f"API Error {resp.status_code}: {resp.text}")
                except Exception as e:
                    print(f"Network error: {e}")

                # Prevent overwhelming API if processing a fast local video file
                await asyncio.sleep(0.01)

    except KeyboardInterrupt:
        print("Processing stopped by user.")
    finally:
        video_service.release()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(main())
