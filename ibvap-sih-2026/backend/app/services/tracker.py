import math
import numpy as np
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.config import settings
from app.utils.logger import logger
from ultralytics.trackers.byte_tracker import BYTETracker
from ultralytics.utils import IterableSimpleNamespace

class TrackObject(BaseModel):
    track_id: int
    camera_id: str
    class_id: int
    class_name: str
    confidence: float
    bbox: Dict[str, float]
    centroid: Dict[str, float]
    
    age: int = 0
    hits: int = 1
    time_since_update: int = 0
    
    first_seen: float
    last_seen: float
    
    previous_centroid: Optional[Dict[str, float]] = None
    trajectory: List[Dict[str, float]] = Field(default_factory=list)
    
    movement_vector: Dict[str, float] = Field(default_factory=lambda: {"dx": 0.0, "dy": 0.0})
    movement_state: str = "UNKNOWN"
    direction: str = "UNKNOWN"
    duration: float = 0.0
    active: bool = True


class BytetrackDetections:
    """Adapter to convert standard dictionary detections to the format expected by BYTETracker."""
    def __init__(self, detections: List[Dict[str, Any]], n_override=None):
        n = len(detections) if n_override is None else n_override
        self.conf = np.zeros(n)
        self.xywh = np.zeros((n, 4))
        self.xyxy = np.zeros((n, 4))
        self.cls = np.zeros(n)
        
        if n_override is None:
            for i, det in enumerate(detections):
                self.conf[i] = det["confidence"]
                b = det["bbox"]
                self.xyxy[i] = [b["x1"], b["y1"], b["x2"], b["y2"]]
                self.xywh[i] = [
                    (b["x1"] + b["x2"]) / 2,
                    (b["y1"] + b["y2"]) / 2,
                    b["x2"] - b["x1"],
                    b["y2"] - b["y1"]
                ]
                self.cls[i] = det["class_id"]
            
    def __getitem__(self, mask):
        res = BytetrackDetections([], n_override=np.sum(mask))
        if self.conf.shape[0] > 0:
            res.conf = self.conf[mask]
            res.xywh = self.xywh[mask]
            res.xyxy = self.xyxy[mask]
            res.cls = self.cls[mask]
        return res
        
    def __len__(self):
        return len(self.conf)


class TrackerService:
    def __init__(self, camera_id: str = "default"):
        self.camera_id = camera_id
        self.tracks: Dict[int, TrackObject] = {}
        
        self.max_age = settings.TRACKER_MAX_AGE
        self.min_hits = settings.TRACKER_MIN_HITS
        self.max_history = settings.HISTORY_MAX_LENGTH
        self.stationary_thresh = settings.MOVEMENT_STATIONARY_THRESHOLD

        args = IterableSimpleNamespace(**{
            'track_high_thresh': settings.TRACK_HIGH_THRESH,
            'track_low_thresh': settings.TRACK_LOW_THRESH,
            'new_track_thresh': settings.NEW_TRACK_THRESH,
            'track_buffer': settings.TRACKER_MAX_AGE,
            'match_thresh': settings.MATCH_THRESH,
            'fuse_score': getattr(settings, 'FUSE_SCORE', True)
        })
        self.byte_tracker = BYTETracker(args)
        
        # Mapping from class_id to class_name based on allowed classes
        self._class_mapping = {}

    def update(self, detection_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        detections = detection_result.get("detections", [])
        timestamp = detection_result.get("timestamp", 0.0)
        
        for det in detections:
            self._class_mapping[det["class_id"]] = det["class_name"]
            
        # Increase time_since_update and age for all existing tracks
        for track in self.tracks.values():
            track.time_since_update += 1
            track.age += 1

        mock_results = BytetrackDetections(detections)
        tracked_objects = []
        if len(mock_results) > 0:
            tracked_objects = self.byte_tracker.update(mock_results)
            
        current_frame_track_ids = set()
        
        for t in tracked_objects:
            # t: [x1, y1, x2, y2, track_id, conf, cls, idx]
            x1, y1, x2, y2, track_id, conf, cls, idx = t
            track_id = int(track_id)
            cls_id = int(cls)
            det_idx = int(idx)
            current_frame_track_ids.add(track_id)
            
            raw_det = detections[det_idx]
            bbox = raw_det["bbox"]
            centroid = raw_det["centroid"]
            confidence = raw_det["confidence"]
            
            if track_id in self.tracks:
                track = self.tracks[track_id]
                track.previous_centroid = track.centroid.copy()
                track.bbox = bbox
                track.centroid = centroid
                track.confidence = confidence
                track.hits += 1
                track.time_since_update = 0
                track.last_seen = timestamp
                
                track.trajectory.append(track.centroid.copy())
                if len(track.trajectory) > self.max_history:
                    track.trajectory.pop(0)
                    
                track.duration = timestamp - track.first_seen
                
                if track.previous_centroid:
                    if len(track.trajectory) >= 3:
                        old_c = track.trajectory[-3]
                        dx = track.centroid["x"] - old_c["x"]
                        dy = track.centroid["y"] - old_c["y"]
                    else:
                        dx = track.centroid["x"] - track.previous_centroid["x"]
                        dy = track.centroid["y"] - track.previous_centroid["y"]

                    track.movement_vector = {"dx": float(dx), "dy": float(dy)}
                    
                    dist = math.hypot(dx, dy)
                    if dist > self.stationary_thresh:
                        track.movement_state = "MOVING"
                        if abs(dx) > abs(dy):
                            track.direction = "RIGHT" if dx > 0 else "LEFT"
                        else:
                            track.direction = "DOWN" if dy > 0 else "UP"
                    else:
                        track.movement_state = "STATIONARY"
                        track.direction = "UNKNOWN"
            else:
                new_track = TrackObject(
                    track_id=track_id,
                    camera_id=self.camera_id,
                    class_id=cls_id,
                    class_name=self._class_mapping.get(cls_id, str(cls_id)),
                    confidence=confidence,
                    bbox=bbox,
                    centroid=centroid,
                    first_seen=timestamp,
                    last_seen=timestamp
                )
                new_track.trajectory.append(new_track.centroid.copy())
                self.tracks[track_id] = new_track
                
        # Mark stale tracks as inactive
        for track_id, track in list(self.tracks.items()):
            if track.time_since_update > self.max_age:
                track.active = False
                
        # Return confirmed tracks that are either active and hit min_hits,
        # or are very new (time_since_update == 0).
        results = []
        for t in self.tracks.values():
            if not t.active or t.hits >= self.min_hits or t.time_since_update == 0:
                results.append(t.model_dump())
                
        # Flush completely inactive tracks
        self.tracks = {tid: t for tid, t in self.tracks.items() if t.active}
        
        return results
