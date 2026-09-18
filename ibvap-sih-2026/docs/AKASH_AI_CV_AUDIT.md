# IBVAP SIH Project - AI & CV Audit
* **Project name**: IBVAP — Intelligent Border Video Analytics Platform
* **Module owner**: Akash
* **Module**: AI + Computer Vision
* **Audit date**: 2026-09-18
* **Repository/branch inspected**: `ibvap-sih-2026` / `main`
* **Overall implementation status**: Foundations and individual components exist, but they are completely disconnected in the main execution pipeline (`stream_service.py`). ByteTrack is incorrectly implemented (it uses a simple greedy algorithm instead).

## 2. AUDIT SUMMARY

| Area                | Status                          | Evidence        | Priority |
| ------------------- | ------------------------------- | --------------- | -------- |
| Video Processing    | 🟡 PARTIAL                      | `backend/app/services/video_service.py` | HIGH     |
| YOLOv8n             | 🟡 PARTIAL                      | `backend/app/services/detector.py` | HIGH     |
| ByteTrack           | ⚠️ BROKEN                       | `backend/app/services/tracker.py` | HIGH     |
| Rule Engine         | ✅ COMPLETE                      | `backend/app/services/rule_engine.py` | HIGH     |
| Restricted Zone     | ✅ COMPLETE                      | `backend/app/services/rule_engine.py` | HIGH     |
| Virtual Fence       | ✅ COMPLETE                      | `backend/app/services/rule_engine.py` | HIGH     |
| Night Activity      | 🟡 PARTIAL                      | `backend/app/services/rule_engine.py` | MEDIUM   |
| Direction Violation | ✅ COMPLETE                      | `backend/app/services/rule_engine.py` | HIGH     |
| Loitering           | ✅ COMPLETE                      | `backend/app/services/rule_engine.py` | HIGH     |
| Event Generation    | 🟡 PARTIAL                      | `backend/app/services/event_service.py` | HIGH     |
| Evidence            | 🟡 PARTIAL                      | `backend/app/services/event_service.py` | MEDIUM   |
| FastAPI Interface   | 🟡 PARTIAL                      | `backend/app/main.py`, `backend/app/routes/` | HIGH     |
| Backend Integration | 🔴 MISSING                      | `backend/app/services/stream_service.py` | HIGH     |
| ANPR                | 🔵 PLACEHOLDER                  | N/A | POST-MVP |

## 3. REPOSITORY STRUCTURE

```text
ibvap-sih-2026/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   └── event.py
│   │   ├── routes/
│   │   │   ├── cameras.py
│   │   │   ├── events.py
│   │   │   ├── evidence.py
│   │   │   ├── health.py
│   │   │   └── zones.py
│   │   ├── services/
│   │   │   ├── detector.py
│   │   │   ├── event_service.py
│   │   │   ├── rule_engine.py
│   │   │   ├── stream_service.py
│   │   │   ├── tracker.py
│   │   │   └── video_service.py
│   │   ├── utils/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   ├── test_cv_pipeline.py
│   └── yolov8n.pt
├── frontend/
├── docker-compose.yml
└── README.md
```

## 4. VIDEO PROCESSING AUDIT
* **Existing files**: `backend/app/services/video_service.py`
* **Important functions**: `VideoService.open()`, `VideoService.read_frame()`, `enhance_low_light()`
* **What works**: Opening webcams/video/RTSP strings, reading frames sequentially, basic CLAHE low-light enhancement.
* **Incomplete/Missing**: Frame skipping (to maintain real-time performance on slower hardware), stream buffering, auto-reconnection on dropped RTSP streams, error handling for corrupted frames.

## 5. YOLOv8n AUDIT
* **Status**: 🟡 PARTIAL
* **Files**: `backend/app/services/detector.py`
* **Implementation details**: 
  * Real inference is implemented using `ultralytics.YOLO` (`yolov8n.pt`).
  * Confidence thresholding and class filtering (person, car, motorcycle, bus, truck) are implemented.
  * Bounding boxes and centroids are accurately generated.
  * CPU/GPU auto-selection is handled.
  * Image quality metrics (brightness, contrast, blur) are extracted before inference.
* **Problem**: In the main `stream_service.py`, detection runs successfully but it is not passed to the tracker or rule engine.

## 6. BYTE TRACK AUDIT
* **Status**: ⚠️ BROKEN (Incorrectly implemented)
* **Files**: `backend/app/services/tracker.py`
* **Implementation details**: 
  * The file claims to be a tracker, but it uses a **custom Greedy matching algorithm** (IoU + Centroid proximity) instead of ByteTrack.
  * Tracker initializes, handles track persistence (age, hits, time_since_update), computes movement vectors, and flushes inactive tracks.
  * Tracks output format: `track_id`, `class_id`, `class_name`, `bbox`, `confidence`, `timestamp`.
* **Verdict**: Not ByteTrack. It's a placeholder basic tracker. Needs replacement with actual `bytetrack` implementation for production reliability. Also, `stream_service.py` currently doesn't even call `TrackerService`.

## 7. SECURITY RULE ENGINE AUDIT
* **Status**: ✅ COMPLETE (Architecture)
* **Files**: `backend/app/services/rule_engine.py`
* **Implementation details**: 
  * A modular OOP architecture exists with a base `Rule` class.
  * Cooldown/debounce logic is implemented in `RuleEngine.check_cooldown` to prevent duplicate events.
  * Evaluates active tracks effectively and outputs formatted alerts.
* **Problem**: Completely disconnected from the live stream in `stream_service.py`.

## 8. RESTRICTED-ZONE DETECTION
* **Status**: ✅ COMPLETE
* **Files**: `backend/app/services/rule_engine.py` -> `RestrictedZoneRule`
* **Implementation**: Uses `is_point_in_polygon` with centroid. Supports `ENTER`, `EXIT`, and `INSIDE` trigger modes. Correctly filters by person/vehicle tracking.

## 9. VIRTUAL FENCE
* **Status**: ✅ COMPLETE
* **Files**: `backend/app/services/rule_engine.py` -> `VirtualFenceRule`
* **Implementation**: Uses line intersection math (`lines_intersect`) between a track's `previous_centroid` and `centroid`. Distinguishes crossing accurately.

## 10. NIGHT-TIME ACTIVITY
* **Status**: 🟡 PARTIAL
* **Files**: `backend/app/services/rule_engine.py` -> `RuleEngine.is_night_time()`
* **Implementation**: Checks current time against `settings.NIGHT_START_TIME` and `NIGHT_END_TIME`. It bumps alert severity from MEDIUM to HIGH if triggered at night. It is a secondary modifier rather than a standalone detection rule.

## 11. DIRECTION VIOLATION
* **Status**: ✅ COMPLETE
* **Files**: `backend/app/services/rule_engine.py` -> `WrongDirectionRule`
* **Implementation**: Validates track's computed `direction` against prohibited direction. Also supports polygon bounding to only check direction within a specific zone.

## 12. LOITERING DETECTION
* **Status**: ✅ COMPLETE
* **Files**: `backend/app/services/rule_engine.py` -> `LoiteringRule`
* **Implementation**: Tracks `entry_times` dictionary. Compares `timestamp - entry_times[track_id]` against `threshold_seconds`. Clears on exit.

## 13. EVENT GENERATION
* **Status**: 🟡 PARTIAL
* **Files**: `backend/app/services/event_service.py`, `backend/app/models/event.py`
* **Implementation**:
  * Event model is robust (`event_id`, `camera_id`, `event_type`, `severity`, `track_id`, `timestamp`, `confidence`, `bbox`, `zone_id`, `snapshot_path`, etc.).
  * Generates correct IDs (`EVT-YYYYMMDD-HHMMSS-<UUID>`).
  * Saves to MongoDB async.
* **Problem**: Not called during live stream.

## 14. ALERT SYSTEM
* **Status**: 🟡 PARTIAL
* **Implementation**: AI side rules generate correctly formatted alerts. However, there is no WebSocket integration, message queue, or REST API forwarding back to Sagar's frontend in real-time. It just saves to DB right now (if called).

## 15. EVIDENCE GENERATION
* **Status**: 🟡 PARTIAL
* **Files**: `backend/app/services/event_service.py` -> `save_snapshot()`
* **Implementation**: Successfully saves `.jpg` frames to local `EVIDENCE_DIR`. Video clips are explicitly stubbed as "Video clips placeholder (stub for future phases)". 

## 16. FASTAPI / AI SERVICE
* **Status**: 🟡 PARTIAL
* **Files**: `backend/app/main.py`
* **Endpoints**:
  * `GET /stream/{camera_id}`: Streams MJPEG bounding boxes.
  * `GET /api/health`, `GET /api/cameras`, `POST /api/zones`, `GET /api/events` are mostly boilerplate CRUD right now for backend integration.
* **Problem**: The `/stream` endpoint hardcodes camera "0" to webcam instead of dynamic RTSP loading, and doesn't execute the rules/tracker.

## 17. AKASH ↔ SAGAR INTEGRATION

### AI → Backend
* **Data AI sends**: `event_id`, `event_type`, `severity`, `camera_id`, `timestamp`, `object_type`, `track_id`, `confidence`, `zone_id`, `reason`, `snapshot_path`, `rule_id`, `movement_state`, `direction`.
* **Status**: Defined in Pydantic schema (`SecurityEvent`).

### Backend → AI
* **Data AI receives**: Right now, the AI module is NOT dynamically receiving camera RTSP URLs, zones, fences, or rule configurations. They are hardcoded or ignored.
* **Missing Interfaces**: AI needs a way to fetch `zones` and `fences` from the DB to dynamically populate the `RuleEngine` for a specific `camera_id`.

## 18. FRONTEND INTEGRATION
* **Dependency**: Vanshika's React Dashboard will consume the MongoDB events and require a live MJPEG stream (or WebRTC) from `/stream/{camera_id}`.

## 19. TESTING AUDIT
* **Coverage**: Extensive test files exist in `backend/tests/` (`test_detector.py`, `test_tracker.py`, `test_rule_engine.py`, `test_event_service.py`, `test_api_events.py`, `test_health.py`, `test_video_service.py`, `test_quality.py`).
* **Verdict**: Good unit testing structure. Integration tests are missing (no end-to-end stream test).

## 20. PERFORMANCE AUDIT
`NOT BENCHMARKED`

## 21. SECURITY AUDIT
* `video_service.py` accepts arbitrary strings as source input via the URL. A malicious user could pass a local file path or command if not sanitized.
* Evidence paths (`snapshot_path`) are saved locally. No path traversal checks are explicitly handled during retrieval (needs check on `evidence.py`).

## 22. TODO / FIXME / PLACEHOLDER SCAN
* `tracker.py`: "For a full production ByteTrack, we would use Kalman filters and bipartite matching" -> Tracker is a mocked greedy tracker.
* `event_service.py`: "Video clips placeholder (stub for future phases)" -> Clips not implemented.
* `main.py`: `source = 0 if camera_id == "0" else camera_id` -> Demo hack.

## 23. DEAD / DUPLICATE CODE
* `backend/test_cv_pipeline.py`: An obsolete script bypassing FastAPI entirely.
* **HUGE ISSUE**: `stream_service.py` ignores `TrackerService`, `RuleEngine`, and `EventService`. It currently ONLY uses `Detector`.

## 24. MVP AI/CV Checklist
[x] Video processing
[x] YOLOv8n
[ ] ByteTrack (MISSING / BROKEN)
[x] Restricted zone
[x] Virtual fence
[x] Night activity
[x] Direction violation
[x] Loitering
[x] Event generation
[ ] Evidence (PARTIAL - only images, no video)
[x] AI API
[ ] Backend integration (MISSING - not wired up in stream)
[x] Testing

## 25. PENDING WORK

### 🔴 P0 — Blocking MVP
1. Integrate Tracker, Rules, and Events into `stream_service.py`.
2. Implement actual ByteTrack algorithm (or pull from library) instead of the Greedy mock.

### 🟠 P1 — Important
1. Fetch dynamic Zone/Fence configurations from Sagar's DB schema into `RuleEngine`.
2. Frame skipping and robust RTSP reconnection in `VideoService`.

### 🟡 P2 — Improvement
1. Video clip generation for Evidence.
2. WebRTC streaming instead of MJPEG for lower latency.

### 🔵 POST-MVP
1. ANPR
2. Advanced Analytics / GPU optimization.

## 26. EXACT FILE-LEVEL ACTION PLAN

| Priority | File | Current Status | Required Action | Reason |
| -------- | ---- | -------------- | --------------- | ------ |
| P0 | `backend/app/services/stream_service.py` | 🔴 BROKEN | Integrate Tracker, RuleEngine, EventService | Currently only draws detector boxes. AI pipeline is severed. |
| P0 | `backend/app/services/tracker.py` | ⚠️ BROKEN | Replace greedy logic with actual ByteTrack | Greedy matching fails in crowded/occluded scenes. |
| P1 | `backend/app/main.py` | 🟡 PARTIAL | Remove hardcoded `0` webcam fallback. Fetch DB camera stream. | Real deployment uses DB RTSP URLs. |
| P1 | `backend/app/services/rule_engine.py` | 🟡 PARTIAL | Add dynamic loading from DB zone configurations. | Rules are currently static/stateless. |

## 27. RECOMMENDED IMPLEMENTATION ORDER
1. Connect existing `TrackerService`, `RuleEngine`, and `EventService` into `stream_service.py` loop.
2. Test end-to-end alert generation in MongoDB.
3. Replace custom tracker in `tracker.py` with the actual `bytetrack` library.
4. Integrate dynamic Zone/Fence configs from Sagar's backend.
5. Implement RTSP stream auto-reconnect.
6. Implement Video Clip generation.

## 28. FINAL STATUS

### AKASH AI/CV STATUS
Completed:
- Rule Engine Architecture
- Restricted Zone, Virtual Fence, Loitering, Direction Violation rules
- Event/Alert Schema
- YOLOv8n core inference
- Snapshot generation
- Unit test structure

Partially Completed:
- Video Processing (lacks robustness/skipping)
- Night Activity (lacks deep filtering)
- FastAPI endpoints (stubbed)

Missing:
- Dynamic DB Configuration Injection (Zones/Fences)
- Video Clip Evidence
- ANPR (Post-MVP)

Broken / Incorrect:
- `stream_service.py` (pipeline disconnected)
- `tracker.py` (Not ByteTrack)

MVP Blockers:
- AI Pipeline is disconnected inside the stream loop. Tracker and Rules are never executed.

Next 5 Actions:
1. Wire `TrackerService` into `stream_service.py`.
2. Wire `RuleEngine` into `stream_service.py`.
3. Wire `EventService` into `stream_service.py` to trigger on Rule alerts.
4. Replace `TrackerService` greedy logic with real ByteTrack.
5. Fetch Zones/Fences from DB instead of hardcoding.
