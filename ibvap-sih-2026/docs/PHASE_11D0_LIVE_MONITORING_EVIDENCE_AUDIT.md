# PHASE 11D.0: LIVE MONITORING & EVIDENCE AUDIT

## A. Current Frontend Live-Monitoring Architecture
- **Location**: `frontend/src/pages/LiveMonitoring.jsx`
- **Component**: Uses `<VideoPlayer>` (from `frontend/src/components/ui/VideoPlayer.jsx`).
- **Transport**: Displays video via an `<img>` tag, relying on MJPEG streaming.
- **Connection String**: Connects to `${API_BASE}/stream/${camera_id}` with a cache-busting timestamp parameter (`?t=Date.now()`).
- **Camera Selection**: Parses cameras from the authenticated `getCameras()` REST API. Uses a `<select>` dropdown to choose the active camera in single-view mode. Grid modes (2x2, 3x3) pull the first N cameras from the list.

## B. Current Backend Streaming Architecture
- **Location**: `backend/app/main.py` (`@app.get("/stream/{camera_id}")`) -> `backend/app/services/stream_service.py` (`generate_annotated_frames()`).
- **Method**: HTTP GET
- **Path**: `/stream/{camera_id}`
- **Authentication**: **NONE**. The endpoint lacks `Depends(get_current_user)` or token validation.
- **Response**: `multipart/x-mixed-replace; boundary=frame` (MJPEG).
- **Source**: Dynamically retrieved via `ConfigService.get_camera_config()`.

## C. Current AI / Video Architecture (Akash's Pipeline)
- **Integration Point**: The AI inference is executed directly inside the MJPEG generator function (`generate_annotated_frames`) in `stream_service.py`.
- **Pipeline**: VideoService -> OpenCV -> Detector (YOLO) -> TrackerService -> RuleEngine -> EventService.
- **Overlays**: Bounding boxes and rule lines (Restricted Zones, Virtual Fences) are burned directly into the image frames via `cv2.rectangle` and `cv2.line` before encoding to JPEG.
- **Constraint**: Because AI runs inside the streaming response generator, multiple frontend consumers hitting the same `/stream/CAM-XXX` endpoint will instantiate multiple redundant AI pipelines, severely impacting performance.

## D. Camera ID Flow
- The identifier used universally is `camera_id` (e.g., `CAM-01`).
- MongoDB stores `camera_id`.
- The frontend correctly binds to `cam.camera_id || cam.id`.
- The API maps `{camera_id}` properly. There are no systemic identifier mismatches.

## E. Evidence Architecture
- **Backend API**: `backend/app/routes/evidence.py`
  - `/snapshots/{filename}`: Authenticated. Securely looks up the event via MongoDB and validates `snapshot_path` using path-traversal protections (`is_safe_path`). Returns `image/jpeg`.
  - `/clips/{filename}`: Authenticated. Similar lookup and protections. Returns `video/mp4`.
- **Frontend**: `frontend/src/pages/Evidence.jsx` calls `fetchEvidenceBlob()`, which passes the JWT via Authorization headers. The blob is converted to a short-lived ObjectURL using `URL.createObjectURL(blob)`.
- **Clips Implementation**: The backend fully supports MP4 clips. However, the frontend `Evidence.jsx` currently falls back to a placeholder `<Video>` icon if `type !== 'snapshot'`. The clip playback UI needs to be wired up.

## F. WebSocket Architecture
- The native WebSocket implementation (Phase 11C) is correctly scoped to events and metadata (`event.created`, `alert.created`).
- The frontend does **not** incorrectly attempt to stream video frames over WebSockets. Video and Event channels remain cleanly separated.

## G. Security Findings
1. **Unauthenticated Stream Access**: **CRITICAL**. `/stream/{camera_id}` is completely open to the public. Anyone with the URL can view the live security feed.
2. **JWT Leakage**: None detected. Evidence API correctly uses Authorization headers.
3. **Hardcoded URLs**: None. Environments (`VITE_API_BASE_URL`) are respected.
4. **Path Traversal**: Protected against in evidence downloads.

## H. UI Capabilities
- **VideoPlayer**: Has a robust DOM-based state machine displaying `CONNECTING`, `BUFFERING`, `LIVE`, `ERROR`, and `DISCONNECTED`. Uses timeouts on `<img>` `onLoad` to infer connection quality. Provides a manual reconnect button and fullscreen mode.
- **AI Overlays (Frontend)**: `VideoPlayer.jsx` contains DOM-based bounding box drawing logic (`detections` prop), but it is currently unused since the AI burns overlays directly into the MJPEG frames on the backend.
- **LiveMonitoring**: Controls grid vs single view nicely.

## I. Exact Integration Gap

| Feature            | Frontend Exists | Backend Exists | Integrated | Action Needed |
| ------------------ | --------------- | -------------- | ---------- | ------------- |
| Camera list        | Yes             | Yes            | Yes        | None |
| Live video         | Yes (MJPEG img) | Yes (MJPEG)    | Yes        | **Fix Authentication** |
| Camera status      | Inferred        | No             | Partial    | None (frontend inference is sufficient for Phase 11D) |
| AI overlay         | Yes (DOM)       | Yes (Burned)   | Yes        | None (rely on backend burned overlays) |
| Real-time events   | Yes             | Yes            | Yes        | None (done in Phase 11C) |
| Real-time alerts   | Yes             | Yes            | Yes        | None (done in Phase 11C) |
| Evidence snapshots | Yes             | Yes            | Yes        | None |
| Evidence clips     | No (Placeholder)| Yes            | No         | **Wire up clip rendering in Evidence.jsx** |
| Camera switching   | Yes             | Yes            | Yes        | None |
| Authentication     | Yes (JWT)       | Yes (Mostly)   | Partial    | **Secure `/stream/{camera_id}`** |

## J. Cross-Team Boundaries
- **AKASH**: Owns `stream_service.py` AI pipeline. (Should not be modified in 11D to fix architectural performance; we must work with the existing MJPEG generator).
- **SAGAR**: Owns backend FastAPI routing and security. Must secure `/stream/{camera_id}` using a token query parameter.
- **VANSHIKA**: Owns frontend React UI. Must append JWT to the `VideoPlayer` image source and wire up MP4 blob rendering in the Evidence Vault.

## K. Recommended Implementation Sequence
1. **Backend**: Add a `token` query parameter validator to `@app.get("/stream/{camera_id}")` in `main.py` that verifies the JWT.
2. **Frontend**: Update `VideoPlayer.jsx` and `LiveMonitoring.jsx` to append `?token=<JWT>` to the `streamSrc`.
3. **Frontend**: Update `Evidence.jsx` and `SecureImage` (rename to `SecureMedia`) to support `video/mp4` blob playback using the HTML5 `<video>` element.
4. **Integration Testing**: Execute the test plan.

## L. Testing Plan
1. Authenticated camera access: Validate `/stream` rejects missing tokens.
2. Camera selection: Validate dropdown switches active MJPEG stream.
3. Live stream availability: Confirm frames render in the grid.
4. Camera disconnect: Simulate network failure, observe `RECONNECTING` state.
5. AI event generation: Wait for a person to cross a zone, ensure backend logs event.
6. WebSocket event delivery: Confirm event pops up on Dashboard immediately.
7. Alert delivery: Confirm critical alert triggers UI pulse.
8. Evidence snapshot creation: Validate JPG exists in backend directory.
9. Evidence retrieval: Fetch snapshot via UI, confirm blob renders.
10. Evidence clip retrieval: Fetch MP4 via UI, confirm video plays.
11. Camera isolation: Open one camera, verify events from another camera do not bleed in.
12. Unauthorized access: Attempt to fetch MJPEG directly via browser URL bar without token -> 401.
13. Invalid camera: Request `/stream/INVALID` -> 404 or gracefully handled.
14. Frontend reconnect: Stop backend, observe frontend error, start backend, observe auto-recovery.
15. Multiple cameras: Open 2x2 grid, verify 4 streams connect.

## M. Blockers
None. The architecture is understood. The critical missing piece is authentication on the MJPEG stream, which is easily resolvable.

**FINAL CLASSIFICATION:**
PHASE 11D0 AUDIT COMPLETE — READY FOR PHASE 11D IMPLEMENTATION
