# IBVAP SIH Project - Phase 2 Video Processing Report
* **Project name**: IBVAP — Intelligent Border Video Analytics Platform
* **Module owner**: Akash
* **Module**: AI + Computer Vision
* **Phase**: 2 - Video Processing
* **Date**: 2026-09-18
* **Status**: ✅ COMPLETE

## 1. Overview
The primary goal of Phase 2 was to build a reliable video input system capable of handling Video Files, Webcams, and RTSP streams, with added stability through buffering, frame skipping, RTSP reconnection, and corrupted frame handling.

The system now features a robust background reader thread pattern that prevents UI/API freezing and prevents OS-level stream buffer bloat for CCTV streams.

## 2. Changes Made
### Modified Files
* **[config.py](file:///Users/sagarsukhadev/Desktop/AI-Seema/ibvap-sih-2026/backend/app/config.py)**
    * Introduced `VIDEO_FRAME_SKIP`, `RTSP_RECONNECT_RETRIES`, `RTSP_RECONNECT_DELAY`, and `VIDEO_BUFFER_SIZE` settings for easy runtime configuration.

* **[video_service.py](file:///Users/sagarsukhadev/Desktop/AI-Seema/ibvap-sih-2026/backend/app/services/video_service.py)**
    * Implemented `threading.Thread` to pull frames continuously in the background, satisfying the **Buffering** requirement.
    * Added `queue.Queue` with zero-latency drop logic. If the AI pipeline is slower than the camera FPS, the oldest unprocessed frames in the queue are dropped, ensuring the pipeline is always analyzing real-time data instead of falling progressively behind.
    * Integrated a full **RTSP Reconnection** loop. If `cv2.VideoCapture` fails on an RTSP stream, it enters an automatic release-and-reopen retry sequence based on `config.py` thresholds.
    * Handled corrupted/empty frames safely by gracefully skipping them instead of crashing the pipeline.

* **[stream_service.py](file:///Users/sagarsukhadev/Desktop/AI-Seema/ibvap-sih-2026/backend/app/services/stream_service.py)**
    * Integrated `video_service.start()` to kick off the background thread.
    * Implemented configurable **Frame Skipping**. By bypassing the YOLO/Tracker rules every `Nth` frame, it significantly cuts CPU usage while still yielding the frames using the last-known tracking boundaries (preserving pipeline state).

* **[test_video_service.py](file:///Users/sagarsukhadev/Desktop/AI-Seema/ibvap-sih-2026/backend/tests/test_video_service.py)**
    * Implemented tests verifying threaded initialization (`test_start_stop_thread`), queue reads (`test_read_frame_empty`), and general robust camera initialization logic.

### Supported Sources
- ✅ Video Files (`.mp4`, `.avi`, etc.)
- ✅ Webcams (Index `0`, `1`, etc.)
- ✅ RTSP Streams (`rtsp://...`)

## 3. Test Execution
Executed `pytest tests/test_video_service.py tests/test_pipeline_integration.py -v`.
* **Result**: `6 passed in 1.54s`
* Validated that video initialization correctly handles thread lifecycle and that Phase 1's AI tracking pipeline has not been broken by the asynchronous video buffering pattern.

## 4. Performance & Memory 
* **Buffering**: Bounded to `VIDEO_BUFFER_SIZE=30` frames. At 1080p RGB, 30 frames takes roughly ~180MB memory footprint per stream.
* **Frame Skipping**: Setting `VIDEO_FRAME_SKIP=2` theoretically drops AI CPU utilization by 50% without affecting track IDs, thanks to the tracker's age mechanism.
* **NOT BENCHMARKED**: Exact end-to-end multi-stream CPU load (requires production-like stream arrays).

## 5. Remaining Issues / Postponed
* Hardware acceleration parsing (e.g. `gstreamer`/`CUDA` decoders) inside `VideoCapture` is currently absent but should be investigated for production server loads.
* The application still uses the greedy placeholder tracker instead of ByteTrack (slated for Phase 4).

## 6. Phase 3 Starting Point
Phase 2 succeeded in making the pipeline robust against network disconnects and processing bottlenecks. Phase 3 should focus on upgrading the internal tracking module (`tracker.py`) to a more robust algorithm like ByteTrack, or focus on DB zone mapping.
