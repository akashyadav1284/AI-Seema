import logging
import cv2
import numpy as np
from typing import Dict, Any, List, Optional
from app.models.detection import DetectionPayload
from app.services.rule_engine import RuleEngine, VirtualFenceRule, RestrictedZoneRule, LoiteringRule, WrongDirectionRule, CrowdRule
from app.services.event_service import EventService
from app.services import camera_service, zone_service

logger = logging.getLogger(__name__)

class DetectionService:
    def __init__(self):
        # Global cache to preserve rule engine state (like cooldowns/loitering trackers)
        # Note: In a heavily scaled multi-worker production app, Redis should back this state.
        self.rule_engines: Dict[str, RuleEngine] = {}
        self.event_service = EventService()

    async def get_or_build_rule_engine(self, camera_id: str) -> RuleEngine:
        if camera_id not in self.rule_engines:
            engine = RuleEngine(camera_id=camera_id)
            await self._load_zones_into_engine(camera_id, engine)
            self.rule_engines[camera_id] = engine
        return self.rule_engines[camera_id]

    async def _load_zones_into_engine(self, camera_id: str, engine: RuleEngine):
        # Fetch active zones for this camera
        zones, _ = await zone_service.list_zones(camera_id=camera_id, limit=1000)
        for zone in zones:
            if not zone.get("active", True):
                continue
                
            zone_type = zone.get("zone_type")
            z_id = zone.get("zone_id")
            geo = zone.get("geometry", {})
            config = zone.get("config", {}) or {}
            
            try:
                if zone_type == "VIRTUAL_FENCE":
                    if "point_a" in geo and "point_b" in geo:
                        engine.add_rule(VirtualFenceRule(f"rule_{z_id}", z_id, geo["point_a"], geo["point_b"]))
                elif zone_type == "RESTRICTED_ZONE":
                    if "polygon" in geo:
                        engine.add_rule(RestrictedZoneRule(f"rule_{z_id}", z_id, geo["polygon"]))
                elif zone_type == "LOITERING":
                    if "polygon" in geo:
                        threshold = config.get("threshold_seconds")
                        engine.add_rule(LoiteringRule(f"rule_{z_id}", z_id, geo["polygon"], threshold))
                elif zone_type == "WRONG_DIRECTION":
                    direction = config.get("prohibited_direction", "UNKNOWN")
                    polygon = geo.get("polygon")
                    engine.add_rule(WrongDirectionRule(f"rule_{z_id}", z_id, direction, polygon))
                elif zone_type == "CROWD":
                    if "polygon" in geo:
                        min_people = config.get("min_people")
                        engine.add_rule(CrowdRule(f"rule_{z_id}", z_id, geo["polygon"], min_people))
            except Exception as e:
                logger.error(f"Failed to load rule for zone {z_id}: {e}")

    async def process_payload(self, payload: DetectionPayload, frame_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        # 1. Validate camera
        camera = await camera_service.get_camera_by_id(payload.camera_id)
        if not camera:
            raise ValueError(f"Unknown camera_id: {payload.camera_id}")
            
        if camera.get("status") != "active":
            raise ValueError(f"Camera {payload.camera_id} is not active.")

        # Decode image if present
        frame = None
        if frame_bytes:
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # 2. Get stateful RuleEngine
        engine = await self.get_or_build_rule_engine(payload.camera_id)

        # 3. Format tracks for RuleEngine
        tracks = []
        for track in payload.tracks:
            t_dict = track.model_dump()
            # The rule engine expects centroid/previous_centroid exactly as dicts
            tracks.append(t_dict)

        # 4. Evaluate Rules
        alerts = engine.evaluate(tracks)

        # 5. Process Alerts -> Events
        generated_event_ids = []
        for alert in alerts:
            # Pass custom timestamp from payload if rule engine overrides
            alert["timestamp"] = payload.timestamp
            
            event = self.event_service.create_event_from_alert(alert, frame=frame)
            success = await self.event_service.save_event_to_db(event)
            if success:
                generated_event_ids.append(event.event_id)
            else:
                logger.error(f"Failed to persist event {event.event_id}")

        return {
            "status": "success",
            "message": "Detections processed.",
            "events_generated": len(generated_event_ids),
            "event_ids": generated_event_ids
        }

# Global singleton to retain state
detection_service = DetectionService()
