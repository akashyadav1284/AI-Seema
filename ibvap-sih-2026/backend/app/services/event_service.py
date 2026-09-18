import os
import cv2
import uuid
import re
import numpy as np
from datetime import datetime
from typing import Optional, Dict, Any

from app.config import settings
from app.models.event import SecurityEvent
from app.database import get_db, is_db_connected

class EventService:
    def __init__(self):
        self.evidence_dir = settings.EVIDENCE_DIR
        self.snapshots_dir = os.path.join(self.evidence_dir, "snapshots")
        self.clips_dir = os.path.join(self.evidence_dir, "clips")
        
        # Ensure directories exist
        os.makedirs(self.snapshots_dir, exist_ok=True)
        os.makedirs(self.clips_dir, exist_ok=True)

    def generate_event_id(self) -> str:
        """
        Generate a unique event ID following IBVAP conventions.
        Format: EVT-YYYYMMDD-HHMMSS-<UUID>
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"EVT-{timestamp}-{unique_id}"

    def sanitize_event_id(self, event_id: str) -> str:
        """
        Ensure the event ID is safe for filesystem use.
        """
        # Only allow alphanumeric, hyphens, and underscores
        return re.sub(r'[^a-zA-Z0-9_-]', '', event_id)

    def save_snapshot(self, frame: np.ndarray, event_id: str, alert: Dict[str, Any]) -> Optional[str]:
        """
        Save the provided frame as a snapshot image and return the local path.
        Draws bounding boxes and metadata on a COPY of the frame.
        """
        try:
            safe_id = self.sanitize_event_id(event_id)
            if not safe_id:
                raise ValueError("Invalid event ID after sanitization")
                
            filename = f"{safe_id}.jpg"
            filepath = os.path.join(self.snapshots_dir, filename)
            
            # Make a copy so we don't mutate the live stream frame
            display_frame = frame.copy()
            
            # Annotate bbox if present
            bbox = alert.get("bbox")
            if bbox and isinstance(bbox, dict) and all(k in bbox for k in ("x1", "y1", "x2", "y2")):
                try:
                    x1, y1 = int(bbox["x1"]), int(bbox["y1"])
                    x2, y2 = int(bbox["x2"]), int(bbox["y2"])
                    cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    
                    # Add label above bounding box
                    label = f"ID: {alert.get('track_id', '?')} {alert.get('event_type', '')}"
                    cv2.putText(display_frame, label, (x1, max(y1 - 10, 10)), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                except Exception as e:
                    print(f"Failed to draw bbox on snapshot {safe_id}: {e}")
            
            # Add general overlay (timestamp, event_id, event_type)
            overlay_text = f"{safe_id} | {alert.get('event_type', 'UNKNOWN')} | {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
            cv2.putText(display_frame, overlay_text, (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            
            # Save using OpenCV
            success = cv2.imwrite(filepath, display_frame)
            if success:
                return filepath
            return None
        except Exception as e:
            # Handle filesystem errors safely
            print(f"Failed to save snapshot for event {event_id}: {e}")
            return None

    def create_event_from_alert(self, alert: Dict[str, Any], frame: Optional[np.ndarray] = None) -> Optional[SecurityEvent]:
        """
        Convert a Phase 4/5 alert into a formal SecurityEvent, capturing evidence.
        """
        try:
            event_id = self.generate_event_id()
            
            # Capture evidence
            snapshot_path = None
            if frame is not None:
                snapshot_path = self.save_snapshot(frame, event_id, alert)
                
            event = SecurityEvent(
                event_id=event_id,
                event_type=alert.get("event_type", "UNKNOWN_ALERT"),
                severity=alert.get("severity", "MEDIUM"),
                camera_id=alert.get("camera_id", "UNKNOWN_CAM"),
                timestamp=alert.get("timestamp", datetime.utcnow().timestamp()),
                object_type=alert.get("object_type", "unknown"),
                track_id=alert.get("track_id", -1),
                confidence=alert.get("confidence", 1.0),
                zone_id=alert.get("zone_id", "UNKNOWN_ZONE"),
                status="PENDING_REVIEW",
                reason=alert.get("reason", "No reason provided."),
                snapshot_path=snapshot_path,
                clip_path=None, # Video clips placeholder (stub for future phases)
                rule_id=alert.get("rule_id"),
                movement_state=alert.get("movement_state"),
                direction=alert.get("direction")
            )
            return event
        except Exception as e:
            print(f"Failed to create event from alert: {e}. Alert data: {alert}")
            return None

    async def save_event_to_db(self, event: Optional[SecurityEvent]) -> bool:
        """
        Persist the security event into MongoDB asynchronously.
        """
        if event is None:
            return False
            
        if not is_db_connected():
            print("MongoDB is not connected. Event will not be saved.")
            return False
            
        db = get_db()
        if db is None:
            return False
            
        try:
            # Insert dict representation
            result = await db["events"].insert_one(event.dict())
            return result.acknowledged
        except Exception as e:
            print(f"Failed to save event {event.event_id} to DB: {e}")
            return False
