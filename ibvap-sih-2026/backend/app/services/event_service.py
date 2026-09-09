import os
import cv2
import uuid
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

    def save_snapshot(self, frame: np.ndarray, event_id: str) -> Optional[str]:
        """
        Save the provided frame as a snapshot image and return the local path.
        """
        try:
            filename = f"{event_id}.jpg"
            filepath = os.path.join(self.snapshots_dir, filename)
            
            # Save using OpenCV
            success = cv2.imwrite(filepath, frame)
            if success:
                return filepath
            return None
        except Exception as e:
            # Handle filesystem errors safely
            print(f"Failed to save snapshot for event {event_id}: {e}")
            return None

    def create_event_from_alert(self, alert: Dict[str, Any], frame: Optional[np.ndarray] = None) -> SecurityEvent:
        """
        Convert a Phase 4 alert into a formal SecurityEvent, capturing evidence.
        """
        event_id = self.generate_event_id()
        
        # Capture evidence
        snapshot_path = None
        if frame is not None:
            snapshot_path = self.save_snapshot(frame, event_id)
            
        event = SecurityEvent(
            event_id=event_id,
            event_type=alert.get("rule_type", "UNKNOWN_ALERT"),
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

    async def save_event_to_db(self, event: SecurityEvent) -> bool:
        """
        Persist the security event into MongoDB asynchronously.
        """
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
