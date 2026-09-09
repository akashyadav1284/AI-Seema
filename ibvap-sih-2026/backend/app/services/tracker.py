import math
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.config import settings
from app.utils.logger import logger

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

def calculate_distance(c1: Dict[str, float], c2: Dict[str, float]) -> float:
    return math.hypot(c1["x"] - c2["x"], c1["y"] - c2["y"])

def calculate_iou(boxA, boxB):
    xA = max(boxA["x1"], boxB["x1"])
    yA = max(boxA["y1"], boxB["y1"])
    xB = min(boxA["x2"], boxB["x2"])
    yB = min(boxA["y2"], boxB["y2"])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = (boxA["x2"] - boxA["x1"]) * (boxA["y2"] - boxA["y1"])
    boxBArea = (boxB["x2"] - boxB["x1"]) * (boxB["y2"] - boxB["y1"])
    
    iou = interArea / float(boxAArea + boxBArea - interArea + 1e-5)
    return iou

class TrackerService:
    def __init__(self, camera_id: str = "default"):
        self.camera_id = camera_id
        self.tracks: List[TrackObject] = []
        self.next_track_id = 1
        
        self.max_age = settings.TRACKER_MAX_AGE
        self.min_hits = settings.TRACKER_MIN_HITS
        self.max_history = settings.HISTORY_MAX_LENGTH
        self.stationary_thresh = settings.MOVEMENT_STATIONARY_THRESHOLD

    def update(self, detection_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        detections = detection_result.get("detections", [])
        timestamp = detection_result.get("timestamp", 0.0)
        
        # Increase time_since_update for all existing tracks
        for track in self.tracks:
            track.time_since_update += 1
            track.age += 1

        unmatched_detections = list(range(len(detections)))
        unmatched_tracks = list(range(len(self.tracks)))

        # Simple greedy matching (IoU + Centroid proximity)
        # For a full production ByteTrack, we would use Kalman filters and bipartite matching
        matches = []
        for d_idx, det in enumerate(detections):
            best_track_idx = -1
            best_score = -1
            
            for t_idx in unmatched_tracks:
                track = self.tracks[t_idx]
                if track.class_id != det["class_id"]:
                    continue
                    
                iou = calculate_iou(det["bbox"], track.bbox)
                dist = calculate_distance(det["centroid"], track.centroid)
                
                # Match score combining IoU and proximity.
                # Tracks that moved very little have high score.
                if iou > 0.2 or dist < 100.0:
                    score = iou + (1.0 / (1.0 + dist))
                    if score > best_score:
                        best_score = score
                        best_track_idx = t_idx
                        
            if best_track_idx != -1:
                matches.append((d_idx, best_track_idx))
                unmatched_tracks.remove(best_track_idx)
                unmatched_detections.remove(d_idx)

        # Update matched tracks
        for d_idx, t_idx in matches:
            det = detections[d_idx]
            track = self.tracks[t_idx]
            
            track.previous_centroid = track.centroid.copy()
            track.bbox = det["bbox"]
            track.centroid = det["centroid"]
            track.confidence = det["confidence"]
            track.hits += 1
            track.time_since_update = 0
            track.last_seen = timestamp
            
            track.trajectory.append(track.centroid.copy())
            if len(track.trajectory) > self.max_history:
                track.trajectory.pop(0)
                
            track.duration = timestamp - track.first_seen
                
            if track.previous_centroid:
                # Use recent trajectory to smooth movement vector if available
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
                    # Determine direction based on dominant axis
                    if abs(dx) > abs(dy):
                        track.direction = "RIGHT" if dx > 0 else "LEFT"
                    else:
                        track.direction = "DOWN" if dy > 0 else "UP"
                else:
                    track.movement_state = "STATIONARY"
                    track.direction = "UNKNOWN"

        # Create new tracks
        for d_idx in unmatched_detections:
            det = detections[d_idx]
            new_track = TrackObject(
                track_id=self.next_track_id,
                camera_id=self.camera_id,
                class_id=det["class_id"],
                class_name=det["class_name"],
                confidence=det["confidence"],
                bbox=det["bbox"],
                centroid=det["centroid"],
                first_seen=timestamp,
                last_seen=timestamp
            )
            new_track.trajectory.append(new_track.centroid.copy())
            self.tracks.append(new_track)
            self.next_track_id += 1

        # Mark stale tracks as inactive instead of removing immediately
        for track in self.tracks:
            if track.time_since_update > self.max_age:
                track.active = False

        # Return confirmed tracks that are either active and hit min_hits,
        # or are very new (time_since_update == 0).
        # We also return inactive tracks one last time so Phase 4 knows they ended.
        results = []
        for t in self.tracks:
            if not t.active or t.hits >= self.min_hits or t.time_since_update == 0:
                results.append(t.model_dump())
        
        # Flush completely inactive tracks
        self.tracks = [t for t in self.tracks if t.active]
        
        return results
