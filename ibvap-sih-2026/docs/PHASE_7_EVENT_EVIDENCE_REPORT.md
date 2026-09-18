# Phase 7: Event & Evidence System Report

## Overview
Phase 7 focused on completing the final stage of the AI pipeline for the IBVAP SIH 2026 project: taking raw security rule alerts generated in Phase 6, converting them into structured `SecurityEvent` models, and saving them to the database along with securely captured, annotated snapshot evidence.

## Changes Implemented

### 1. `EventService` Enhancement (`backend/app/services/event_service.py`)
- **Evidence Annotation**: Added logic using OpenCV (`cv2`) to draw the bounding box of the tracked object (`bbox`) and overlay the event ID, event type, and timestamp on a **copy** of the video frame. This ensures the visual evidence explicitly demonstrates the violation without corrupting the original frame used for processing.
- **Path Traversal Security**: Added `sanitize_event_id` to strictly allow alphanumeric characters, hyphens, and underscores, effectively neutralizing any path traversal attacks (e.g. `../../filename`) before using the event ID to write to the local filesystem.
- **Resilience Strategy**: Wrapped the primary `create_event_from_alert` and `save_snapshot` methods in comprehensive `try...except` blocks. If an alert contains malformed data or if the filesystem encounters an unexpected error, the pipeline will degrade gracefully by returning a generic event or logging the error, rather than crashing the background video processing loop.

### 2. `RuleEngine` Updates (`backend/app/services/rule_engine.py`)
- **Metadata Propagation**: Updated `build_alert` to forward the bounding box (`bbox`) dictionary from the track data into the generated alert dictionary. This connects the detection coordinates from ByteTrack (Phase 4) with the `EventService` drawing logic (Phase 7).

### 3. Comprehensive Testing (`backend/tests/test_event_service.py`)
- Rewrote `test_create_event_from_alert` to use the correct `event_type` key (resolving a Phase 5 schema change).
- Added `test_sanitize_event_id` to verify path traversal strings are sanitized into safe filenames.
- Added `test_save_snapshot_with_bbox` utilizing `unittest.mock.patch` on `cv2.imwrite`, `cv2.rectangle`, and `cv2.putText` to ensure the correct drawing logic executes when a valid `bbox` is passed.
- Added `test_malformed_alert_handling` to ensure missing required keys in an alert do not cause unhandled exceptions.

## Verification
- Run `pytest backend/tests/test_event_service.py` to test the isolated `EventService` logic.
- Run `pytest backend/tests/test_pipeline_integration.py` to ensure the entire multi-stage processing pipeline runs smoothly, now incorporating bounding box annotations.

## Next Steps
The AI/CV pipeline (Phases 1-7) is fully operational. The next stages involve backend API integrations, database loading, and frontend dashboard hookups, which fall under Backend/Frontend team responsibilities.
