import asyncio
import cv2
import numpy as np
import httpx
import sys
import os
import json
import time
from pathlib import Path

# Add backend root to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.services.detector import Detector
from app.services.tracker import TrackerService
from app.models.detection import DetectionPayload, TrackedDetection
from app.database import connect_to_mongo, close_mongo_connection
from app.services import camera_service, zone_service

async def get_token():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        # Create a test user if needed, or use default
        try:
            res = await client.post("/api/auth/register", json={
                "email": "ai_test@example.com",
                "password": "Password123!",
                "name": "AI Test",
                "role": "admin"
            })
        except Exception:
            pass

        res = await client.post("/api/auth/login", data={
            "username": "ai_test@example.com",
            "password": "Password123!"
        })
        if res.status_code == 200:
            return res.json()["access_token"]
        return None

async def test_e2e():
    print("Testing E2E AI flow...")
    await connect_to_mongo()
    
    # Ensure test camera exists
    cam = await camera_service.get_camera_by_id("cam_1")
    if not cam:
        from app.models.camera import CameraCreate
        await camera_service.create_camera(CameraCreate(**{
            "camera_id": "cam_1",
            "name": "Test Cam",
            "location": "Test Area",
            "source_type": "video",
            "source": "dummy.mp4",
            "status": "active"
        }))
    
    detector = Detector()
    detector.initialize()
    tracker = TrackerService(camera_id="cam_1")
    
    # Create a blank frame
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    # Add a fake person
    cv2.rectangle(frame, (100, 100), (200, 300), (255, 255, 255), -1)
    
    result = detector.detect(frame, frame_number=1)
    tracks = tracker.update(result)
    
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
        camera_id="cam_1",
        timestamp=time.time(),
        frame_number=1,
        tracks=tracked_detections
    )
    
    token = await get_token()
    if not token:
        print("Failed to get token")
        return

    # Encode frame
    _, buffer = cv2.imencode('.jpg', frame)
    frame_bytes = buffer.tobytes()

    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        # Test 1: Valid payload
        response = await client.post(
            "/api/detections/",
            headers={"Authorization": f"Bearer {token}"},
            data={"payload": payload.model_dump_json()},
            files={"frame": ("frame.jpg", frame_bytes, "image/jpeg")}
        )
        print(f"Valid payload response: {response.status_code}")
        print(response.json())
        
        # Test 2: Invalid camera ID
        bad_payload = payload.model_copy()
        bad_payload.camera_id = "nonexistent_cam"
        response = await client.post(
            "/api/detections/",
            headers={"Authorization": f"Bearer {token}"},
            data={"payload": bad_payload.model_dump_json()},
            files={"frame": ("frame.jpg", frame_bytes, "image/jpeg")}
        )
        print(f"Invalid camera response: {response.status_code}")
        print(response.json())
        
        # Test 3: Malformed Payload (missing required)
        response = await client.post(
            "/api/detections/",
            headers={"Authorization": f"Bearer {token}"},
            data={"payload": '{"camera_id": "cam_1"}'}, # missing tracks, timestamp etc
        )
        print(f"Malformed payload response: {response.status_code}")
        print(response.json())

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_e2e())
