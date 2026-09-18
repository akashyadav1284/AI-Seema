# IBVAP SIH Project - Phase 3 YOLO Detection Report
* **Project name**: IBVAP — Intelligent Border Video Analytics Platform
* **Module owner**: Akash
* **Module**: AI + Computer Vision
* **Phase**: 3 - YOLOv8n Object Detection
* **Date**: 2026-09-18
* **Status**: ✅ COMPLETE

## 1. Overview
The primary goal of Phase 3 was to make the YOLOv8n implementation reliable, configurable, and robust, providing standardized detection data to downstream components like the tracker.

The YOLOv8n detection layer is now resilient to inference failures, validates incoming frames to prevent crashes, and uses the central configuration system to allow dynamic modification of its capabilities without changing the code.

## 2. Changes Made
### Modified Files
* **[config.py](file:///Users/sagarsukhadev/Desktop/AI-Seema/ibvap-sih-2026/backend/app/config.py)**
    * Added `YOLO_IOU_THRESHOLD = 0.45` to control NMS (Non-Maximum Suppression) overlapping bounding box removal.
    * Added `YOLO_ALLOWED_CLASSES = [0, 2, 3, 5, 7]` so that class filtering (person, car, motorcycle, bus, truck) is configurable rather than hardcoded in the detector class.

* **[detector.py](file:///Users/sagarsukhadev/Desktop/AI-Seema/ibvap-sih-2026/backend/app/services/detector.py)**
    * **Configurable Setup**: Updated `__init__` to load the new config parameters.
    * **Input Validation**: Added explicit type (`np.ndarray`) and empty-size checks for incoming video frames before passing them to the model, returning empty detections instead of throwing OpenCV/Ultralytics exceptions.
    * **Robust Inference**: Wrapped the `model.predict()` call in a `try-except` block to prevent CUDA OOM or other unexpected tensor errors from crashing the background video processing loop.
    * **IoU Integration**: Added the `iou` parameter to the prediction call.

* **[test_detector.py](file:///Users/sagarsukhadev/Desktop/AI-Seema/ibvap-sih-2026/backend/tests/test_detector.py)**
    * Completely rewrote the test file to use robust `unittest.mock` techniques, ensuring fast and isolated CI/CD testing without needing to download the ~6MB `yolov8n.pt` weights.
    * Added coverage for successful inference parsing, empty detections, invalid frame rejection, and catastrophic inference failure handling.

## 3. Detection Output Schema
The detector correctly normalizes output into a stable schema, making it highly reliable for Phase 4 consumption:
```json
{
  "class_id": 0,
  "class_name": "person",
  "confidence": 0.9,
  "bbox": {
    "x1": 10.0,
    "y1": 10.0,
    "x2": 50.0,
    "y2": 50.0
  },
  "centroid": {
    "x": 30.0,
    "y": 30.0
  }
}
```

## 4. Test Execution
Executed `pytest tests/test_detector.py tests/test_pipeline_integration.py -v`.
* **Result**: `7 passed in 1.50s`
* Validated that the newly robust detector layer successfully passes its own unit tests and still seamlessly integrates with the Phase 1 tracking pipeline.

## 5. Performance & Memory 
* **NOT BENCHMARKED**: Exact end-to-end multi-stream CPU/GPU inference latency (requires production-like stream arrays and actual hardware profiles).

## 6. Remaining Issues / Postponed
* ByteTrack implementation remains postponed for Phase 4.

## 7. Phase 4 Starting Point
Phase 3 succeeded in locking down the Object Detection layer. We have reliable frames feeding reliable YOLOv8n detections. The next step, **Phase 4**, will finally replace the placeholder greedy tracker with actual **ByteTrack**.
