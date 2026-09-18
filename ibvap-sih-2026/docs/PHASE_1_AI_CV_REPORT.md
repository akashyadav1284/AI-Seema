# IBVAP SIH Project - Phase 1 AI & CV Report
* **Project name**: IBVAP — Intelligent Border Video Analytics Platform
* **Module owner**: Akash
* **Module**: AI + Computer Vision
* **Phase**: 1 - AI/CV Pipeline Foundation
* **Date**: 2026-09-18
* **Status**: ✅ COMPLETE

## 1. Overview
The primary goal of Phase 1 was to establish a solid execution foundation by connecting the disconnected AI components into a cohesive, orchestrated pipeline inside `stream_service.py` without rewriting the core components.

The AI/CV pipeline now functions end-to-end:
`Video Frame -> YOLOv8n Detector -> Tracker -> Rule Engine -> Event Service -> Security Event`

## 2. Changes Made
### Modified Files
* **[stream_service.py](file:///Users/sagarsukhadev/Desktop/AI-Seema/ibvap-sih-2026/backend/app/services/stream_service.py)**
    * Converted `generate_annotated_frames` to an asynchronous generator.
    * Integrated `TrackerService` and `RuleEngine` directly into the frame processing loop.
    * Wrapped CPU-bound synchronous tasks (like OpenCV reads, YOLO detections, rule engine execution) inside `run_in_threadpool` to prevent blocking the FastAPI asyncio event loop.
    * Added `EventService` execution for any alerts triggered by `RuleEngine`, successfully generating events and attempting database persistence.
    * Updated bounding box visualizations to utilize Tracker ID assignments.
    * Hardcoded a sample `RestrictedZoneRule` to test the pipeline (as dynamic DB zones are postponed to a later phase).

### Created Files
* **[test_pipeline_integration.py](file:///Users/sagarsukhadev/Desktop/AI-Seema/ibvap-sih-2026/backend/tests/test_pipeline_integration.py)**
    * Implemented a new test suite verifying that a mock detection cleanly flows through the `Tracker`, triggers the `RuleEngine`, and successfully instantiates a `SecurityEvent` via the `EventService`.

## 3. Test Execution
Executed `pytest tests/test_pipeline_integration.py -v`.
* **Result**: `1 passed in 1.46s`
* The test manually steps through the core AI components, verifying that components interface correctly and schemas are maintained.

## 4. Pipeline Before vs. After
### Before (Audit State)
```text
VideoService -> Detector -> Stream Output
(Tracker, RuleEngine, EventService ignored/skipped)
```

### After (Phase 1 State)
```text
VideoService
    ↓
Detector (YOLOv8n)
    ↓
Tracker (Greedy algorithm assigns track_id)
    ↓
RuleEngine (Evaluates RestictedZoneRule)
    ↓
EventService (Generates SecurityEvent + Snapshot)
    ↓
Async MongoDB save & Stream Output
```

## 5. Postponed to Later Phases
In adherence to the scope restrictions, the following features were intentionally not implemented in this phase:
* **Phase 4**: Replacing the greedy matching algorithm with a fully functional ByteTrack implementation.
* Dynamic loading of cameras, zones, and fences from the MongoDB database (currently hardcoded for MVP testing).
* Advanced RTSP stream auto-reconnection and buffering.
* Frame skipping and performance optimizations.
* Video clip evidence generation (only snapshots are currently handled).

## 6. Phase 2 Starting Point
The underlying pipeline works and can successfully generate security alerts based on tracking behavior. Phase 2 should likely focus on dynamically linking the AI pipeline configurations (zones, camera sources, fence lines) to the actual database records created by the React frontend, removing the hardcoded Phase 1 constraints.
