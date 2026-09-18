# AI / CV Final Architecture (MVP)

## 1. System Overview

The IBVAP AI module provides real-time security analysis on video feeds (CCTV, webcams, or video files). It processes incoming frames, detects and tracks objects, evaluates movement against defined spatial configurations (zones, fences), and securely persists evidence when violations occur.

```text
                  +-------------------+
                  | ConfigService     | (MongoDB)
                  +-------------------+
                           |
                           v
+---------------+    +-------------------+    +---------------+
| Video Input   | -> | VideoService      | -> | Preprocessing |
| (RTSP/Webcam) |    | (Queue/Thread)    |    | (Enhancement) |
+---------------+    +-------------------+    +---------------+
                                                     |
                                                     v
+---------------+    +-------------------+    +---------------+
| RuleEngine    | <- | ByteTrack         | <- | YOLOv8n       |
| (Rules/Logic) |    | (Tracking/IDs)    |    | (Detection)   |
+---------------+    +-------------------+    +---------------+
       |
       v
+---------------+    +-------------------+    +---------------+
| EventService  | -> | Snapshot Evidence | -> | Backend API   |
| (Alerts/Gen)  |    | (OpenCV drawing)  |    | (MongoDB)     |
+---------------+    +-------------------+    +---------------+
```

## 2. Component Breakdown

### 2.1 VideoService
- **Purpose**: Establishes connections to video sources (RTSP, webcam, local files).
- **Architecture**: Operates on a background daemon thread utilizing `cv2.VideoCapture`. To prevent bottleneck OOM issues, frames are pushed to a `queue.Queue` of limited size (`VIDEO_BUFFER_SIZE`). If YOLO latency spikes, older frames are strategically dropped.
- **Security**: RTSP URLs are stripped of credentials (`_mask_url`) prior to internal logging. Handles automated reconnects for dropped streams.

### 2.2 Detector (YOLOv8n)
- **Purpose**: Generates bounding boxes and class labels (person, car, truck, etc.) for each frame.
- **Architecture**: Leverages the Ultralytics API. In MVP, runs on CPU fallback with frame-skipping applied in `stream_service.py` (`VIDEO_FRAME_SKIP`) to ensure steady queue polling.

### 2.3 Tracker (ByteTrack)
- **Purpose**: Links YOLO detections across sequential frames to assign persistent `track_id`s.
- **Architecture**: Wrapped in `TrackerService`. Calculates velocity and trajectory, establishing state (Active vs Inactive) to aid rule evaluations. 

### 2.4 Rule Engine
- **Purpose**: Determines if a tracked object's behavior violates configured security policies.
- **Rules Supported**:
  - **Restricted Zone Rule**: ENTER, EXIT, or INSIDE polygon evaluations.
  - **Virtual Fence Rule**: Line cross evaluations considering directional movement.
  - **Wrong Direction**: Triggered if standard directional velocity vectors oppose a target vector.
  - **Loitering**: Triggered if total accumulated time inside a zone exceeds a threshold.
  - **Night Activity**: Elevated sensitivity or specific zone lockdown triggered dynamically between specific hours (e.g., 22:00 -> 06:00).
- **Cooldowns**: Includes per-track suppression logic to prevent event spamming (e.g., 100 alerts for the same person loitering).

### 2.5 EventService & Evidence
- **Purpose**: Converts a Rule Engine `alert` into a standardized `SecurityEvent`.
- **Architecture**:
  - Automatically annotates a cloned frame with Bounding Boxes and Event Identifiers.
  - Generates secure, regex-sanitized event UUIDs (`EVT-YYYYMMDD-HHMMSS-<UUID>`).
  - Persists JSON records via MongoDB asynchronously.

### 2.6 ConfigService
- **Purpose**: Bridges the AI module to the Backend Database.
- **Architecture**: Instantiates rules per `camera_id` dynamically upon request. Prevents the need to hardcode polygon arrays and effectively isolates tracking state across multiple concurrent camera streams.

---

## 3. Future Extension: ANPR (Post-MVP)

Automatic Number Plate Recognition (ANPR) is planned for the next major release phase. It will seamlessly integrate into the current pipeline between ByteTrack and the Rule Engine.

### 3.1 ANPR Flow Architecture
1. **Vehicle Detection (Existing)**: YOLO detects a "car" or "truck".
2. **Vehicle Track (Existing)**: ByteTrack assigns `track_id=45`.
3. **Plate Detection (New)**: If the object is a vehicle, crop the bounding box and run a secondary lightweight YOLO Plate Detector.
4. **Plate OCR (New)**: Pass the plate crop into an OCR engine (e.g., EasyOCR / Tesseract).
5. **Plate Validation (New)**: Regex string matching against local format requirements.
6. **State Assignment (New)**: Map the string `"MH12AB1234"` to `track_id=45`. 
7. **Rule Engine & Event (Existing/Updated)**: A "Blacklisted Vehicle Rule" checks the string. `EventService` automatically attaches the OCR result to the output JSON and Evidence snapshot.

This targeted approach prevents running OCR on every frame or on pedestrians, saving significant CPU/GPU compute cycles.
