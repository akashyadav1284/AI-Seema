# IBVAP Phase 2: Video Intelligence Engine

Phase 2 focuses on adding the core video processing and object detection capabilities to the IBVAP platform. This phase establishes the foundation for future intelligent tracking and security alert systems.

## Features Added

1. **Video Ingestion:**
   - Supports local video files (`.mp4`, `.avi`, etc.)
   - Supports Webcams
   - Prepared for RTSP streams
   - Safe error handling for missing/corrupt streams

2. **YOLO Detection Engine:**
   - Integrated `Ultralytics YOLOv8n` for lightweight inference.
   - Filters specifically for security-relevant classes: `person`, `car`, `motorcycle`, `bus`, `truck`.
   - Calculates bounding boxes, centroids, and confidence scores.

3. **Frame Quality Monitoring:**
   - Detects low light and very dark conditions.
   - Detects low contrast or blurry conditions.
   - Prepares the system for fog/rain/dust critical cases by maintaining awareness of image degradation.

4. **CLI Testing Tool:**
   - A standalone runner (`scripts/run_detection.py`) to test the AI engine without requiring the full backend/frontend stack.

## Known Limitations & Critical Case Matrix

Phase 2 specifically addresses the Video Intelligence layer. Please note the following limitations:

- **Tracking:** There are no persistent object IDs (ByteTrack). Objects are detected per-frame.
- **Alerts:** A detected person does *not* generate a security alert yet. The rule engine belongs to Phase 4.
- **Camouflage:** Camouflage is not "solved." We rely on YOLO's confidence scores. Future motion analysis will improve this.
- **Image Quality:** "Fog" or "Rain" are not specifically classified. We report generic image quality degradation (e.g., `BLURRY` or `LOW_CONTRAST`).
- **Thermal:** Normal RGB cameras are used; true thermal detection is not simulated.

## Architecture & Phase 3 Handoff

The `Detector` output is strictly JSON-ready, providing bounding boxes, centroids, confidence, and class IDs. Phase 3 will take this exact output and pass it through ByteTrack to append a `track_id`.

Example detection format:
```json
{
  "class_name": "person",
  "confidence": 0.91,
  "bbox": { "x1": 120, "y1": 80, "x2": 250, "y2": 420 },
  "centroid": { "x": 185, "y": 250 }
}
```

## Running the Demo

To test the Phase 2 engine on a video:
```bash
python scripts/run_detection.py --source-type video --path ../data/videos/demo.mp4 --save-output
```
