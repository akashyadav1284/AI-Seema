import time
import numpy as np
import cv2
import asyncio
from app.services.detector import Detector
from app.services.tracker import TrackerService
from app.services.rule_engine import RuleEngine, RestrictedZoneRule
from app.services.video_service import enhance_low_light

async def run_benchmark():
    print("Initializing components for benchmark...")
    detector = Detector()
    detector.initialize()
    tracker = TrackerService(camera_id="bench_cam")
    rule_engine = RuleEngine(camera_id="bench_cam")
    
    # Add a mock rule
    polygon = [{"x": 10.0, "y": 10.0}, {"x": 200.0, "y": 10.0}, {"x": 200.0, "y": 200.0}, {"x": 10.0, "y": 200.0}]
    rule_engine.add_rule(RestrictedZoneRule(rule_id="R1", zone_id="Z1", polygon=polygon, trigger_on="ENTER"))

    # Generate synthetic frames
    print("Generating synthetic frames...")
    frames = [np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8) for _ in range(50)]
    
    print(f"Running benchmark on {len(frames)} frames...")
    
    total_start = time.time()
    enhance_time = 0.0
    detect_time = 0.0
    track_time = 0.0
    rule_time = 0.0

    for i, frame in enumerate(frames):
        # 1. Enhancement
        t0 = time.time()
        enhanced = enhance_low_light(frame)
        t1 = time.time()
        enhance_time += (t1 - t0)
        
        # 2. Detection
        t0 = time.time()
        detections = detector.detect(enhanced, frame_number=i+1)
        t1 = time.time()
        detect_time += (t1 - t0)
        
        # 3. Tracking
        t0 = time.time()
        tracks = tracker.update(detections)
        t1 = time.time()
        track_time += (t1 - t0)
        
        # 4. Rules
        t0 = time.time()
        alerts = rule_engine.evaluate(tracks)
        t1 = time.time()
        rule_time += (t1 - t0)

    total_end = time.time()
    
    total_time = total_end - total_start
    n = len(frames)
    
    print("\n--- BENCHMARK RESULTS ---")
    print(f"Total Frames Processed: {n}")
    print(f"Total Time: {total_time:.4f} sec")
    print(f"Overall FPS: {n / total_time:.2f}")
    print(f"Avg Enhancement Latency: {(enhance_time/n)*1000:.2f} ms")
    print(f"Avg Detection Latency (YOLO): {(detect_time/n)*1000:.2f} ms")
    print(f"Avg Tracking Latency (ByteTrack): {(track_time/n)*1000:.2f} ms")
    print(f"Avg Rule Engine Latency: {(rule_time/n)*1000:.2f} ms")
    print("-------------------------\n")

if __name__ == "__main__":
    asyncio.run(run_benchmark())
