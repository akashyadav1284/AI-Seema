import time
import logging
from typing import List, Dict, Any, Optional, Set
from datetime import datetime

from app.config import settings
from app.utils.geometry import is_point_in_polygon, lines_intersect

logger = logging.getLogger(__name__)

class Rule:
    def __init__(self, rule_id: str, zone_id: str, event_type: str, enabled: bool = True, target_classes: Optional[List[str]] = None):
        self.rule_id = rule_id
        self.zone_id = zone_id
        self.event_type = event_type
        self.enabled = enabled
        self.target_classes = target_classes
        self.is_group_rule = False
        
    def is_target_class(self, class_name: str) -> bool:
        if self.target_classes is None or len(self.target_classes) == 0:
            return True
        return class_name in self.target_classes

    def has_valid_centroid(self, track: Dict[str, Any], key: str = "centroid") -> bool:
        centroid = track.get(key)
        if not isinstance(centroid, dict):
            return False
        return "x" in centroid and "y" in centroid and centroid["x"] is not None and centroid["y"] is not None

    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        return None

    def evaluate_group(self, tracks: List[Dict[str, Any]], timestamp: float) -> Optional[Dict[str, Any]]:
        return None

    def clean_expired_tracks(self, active_track_ids: Set[int]):
        pass

class VirtualFenceRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, point_a: Dict[str, float], point_b: Dict[str, float], enabled: bool = True, target_classes: Optional[List[str]] = None):
        super().__init__(rule_id, zone_id, "VIRTUAL_FENCE", enabled, target_classes)
        self.point_a = point_a
        self.point_b = point_b

    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        if not self.is_target_class(track.get("class_name", "")):
            return None
            
        if not self.has_valid_centroid(track, "centroid") or not self.has_valid_centroid(track, "previous_centroid"):
            return None
            
        prev_c = track["previous_centroid"]
        curr_c = track["centroid"]
        
        if lines_intersect(prev_c, curr_c, self.point_a, self.point_b):
            return {
                "rule_id": self.rule_id,
                "event_type": self.event_type,
                "triggered": True,
                "zone_id": self.zone_id,
                "reason": f"Object crossed restricted fence {self.zone_id}.",
                "severity": "HIGH"
            }
        return None

class RestrictedZoneRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, polygon: List[Dict[str, float]], trigger_on: str = "ENTER", enabled: bool = True, target_classes: Optional[List[str]] = None):
        super().__init__(rule_id, zone_id, "RESTRICTED_ZONE", enabled, target_classes)
        self.polygon = polygon
        self.trigger_on = trigger_on

    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        if not self.is_target_class(track.get("class_name", "")):
            return None
            
        if not self.has_valid_centroid(track, "centroid"):
            return None

        curr_c = track["centroid"]
        is_inside_now = is_point_in_polygon(curr_c, self.polygon)
        
        is_inside_before = False
        if self.has_valid_centroid(track, "previous_centroid"):
            is_inside_before = is_point_in_polygon(track["previous_centroid"], self.polygon)
            
        triggered = False
        reason = ""
        
        if self.trigger_on == "ENTER" and is_inside_now and not is_inside_before:
            triggered = True
            reason = f"Object entered restricted zone {self.zone_id}."
        elif self.trigger_on == "EXIT" and not is_inside_now and is_inside_before:
            triggered = True
            reason = f"Object exited restricted zone {self.zone_id}."
        elif self.trigger_on == "INSIDE" and is_inside_now:
            triggered = True
            reason = f"Object is inside restricted zone {self.zone_id}."
            
        if triggered:
            return {
                "rule_id": self.rule_id,
                "event_type": self.event_type,
                "triggered": True,
                "zone_id": self.zone_id,
                "reason": reason,
                "severity": "MEDIUM"
            }
        return None

class LoiteringRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, polygon: List[Dict[str, float]], threshold_seconds: int = None, enabled: bool = True, target_classes: Optional[List[str]] = None):
        super().__init__(rule_id, zone_id, "LOITERING", enabled, target_classes)
        self.polygon = polygon
        self.threshold_seconds = threshold_seconds or settings.LOITERING_THRESHOLD_SECONDS
        self.entry_times: Dict[int, float] = {}

    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        if not self.is_target_class(track.get("class_name", "")):
            return None
            
        if not self.has_valid_centroid(track, "centroid"):
            return None

        curr_c = track["centroid"]
        is_inside = is_point_in_polygon(curr_c, self.polygon)
        track_id = track.get("track_id")
        
        if track_id is None:
            return None

        if is_inside:
            if track_id not in self.entry_times:
                self.entry_times[track_id] = timestamp
            else:
                dwell_time = timestamp - self.entry_times[track_id]
                if dwell_time >= self.threshold_seconds:
                    return {
                        "rule_id": self.rule_id,
                        "event_type": self.event_type,
                        "triggered": True,
                        "zone_id": self.zone_id,
                        "reason": f"Object {track_id} loitered in zone {self.zone_id} for {int(dwell_time)} seconds.",
                        "severity": "MEDIUM"
                    }
        else:
            if track_id in self.entry_times:
                del self.entry_times[track_id]
                
        return None

    def clean_expired_tracks(self, active_track_ids: Set[int]):
        expired = [tid for tid in self.entry_times if tid not in active_track_ids]
        for tid in expired:
            del self.entry_times[tid]

class WrongDirectionRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, prohibited_direction: str, polygon: Optional[List[Dict[str, float]]] = None, enabled: bool = True, target_classes: Optional[List[str]] = None):
        super().__init__(rule_id, zone_id, "WRONG_DIRECTION", enabled, target_classes)
        self.prohibited_direction = prohibited_direction.upper()
        self.polygon = polygon

    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        if not self.is_target_class(track.get("class_name", "")):
            return None
            
        direction = track.get("direction", "UNKNOWN").upper()
        
        if direction == "UNKNOWN" or direction != self.prohibited_direction:
            return None
            
        if self.polygon:
            if not self.has_valid_centroid(track, "centroid"):
                return None
            if not is_point_in_polygon(track["centroid"], self.polygon):
                return None
                
        return {
            "rule_id": self.rule_id,
            "event_type": self.event_type,
            "triggered": True,
            "zone_id": self.zone_id,
            "reason": f"Object {track.get('track_id', 'unknown')} moved in prohibited direction {self.prohibited_direction} in {self.zone_id}.",
            "severity": "HIGH"
        }

class CrowdRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, polygon: List[Dict[str, float]], min_people: int = None, enabled: bool = True, target_classes: Optional[List[str]] = None):
        classes = target_classes if target_classes is not None else ["person"]
        super().__init__(rule_id, zone_id, "CROWD", enabled, classes)
        self.polygon = polygon
        self.min_people = min_people or settings.CROWD_MIN_PEOPLE
        self.is_group_rule = True

    def evaluate_group(self, tracks: List[Dict[str, Any]], timestamp: float) -> Optional[Dict[str, Any]]:
        people_inside = 0
        for track in tracks:
            if not track.get("active", True) or not self.is_target_class(track.get("class_name", "")):
                continue
            if self.has_valid_centroid(track, "centroid") and is_point_in_polygon(track["centroid"], self.polygon):
                people_inside += 1
                
        if people_inside >= self.min_people:
            return {
                "rule_id": self.rule_id,
                "event_type": self.event_type,
                "triggered": True,
                "zone_id": self.zone_id,
                "reason": f"Crowd detected: {people_inside} people inside {self.zone_id}.",
                "severity": "HIGH"
            }
        return None

class NightActivityRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, polygon: Optional[List[Dict[str, float]]] = None, enabled: bool = True, target_classes: Optional[List[str]] = None):
        super().__init__(rule_id, zone_id, "NIGHT_ACTIVITY", enabled, target_classes)
        self.polygon = polygon

    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        if not self.is_target_class(track.get("class_name", "")):
            return None

        if not RuleEngine.is_night_time_static():
            return None

        if self.polygon:
            if not self.has_valid_centroid(track, "centroid"):
                return None
            if not is_point_in_polygon(track["centroid"], self.polygon):
                return None

        return {
            "rule_id": self.rule_id,
            "event_type": self.event_type,
            "triggered": True,
            "zone_id": self.zone_id,
            "reason": f"Activity detected during night time in {self.zone_id}.",
            "severity": "HIGH"
        }

class RuleEngine:
    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        self.rules: List[Rule] = []
        self.cooldowns: Dict[str, float] = {}
        
    def add_rule(self, rule: Rule):
        self.rules.append(rule)

    @staticmethod
    def is_night_time_static() -> bool:
        now = datetime.now().time()
        try:
            start = datetime.strptime(settings.NIGHT_START_TIME, "%H:%M").time()
            end = datetime.strptime(settings.NIGHT_END_TIME, "%H:%M").time()
        except Exception:
            return False
            
        if start <= end:
            return start <= now <= end
        else:
            return now >= start or now <= end

    def is_night_time(self) -> bool:
        return self.is_night_time_static()

    def check_cooldown(self, rule_id: str, zone_id: str, subject_id: str, current_time: float) -> bool:
        key = f"{self.camera_id}_{rule_id}_{zone_id}_{subject_id}"
        last_time = self.cooldowns.get(key, 0.0)
        
        if current_time - last_time < settings.ALERT_COOLDOWN_SECONDS:
            return False
            
        self.cooldowns[key] = current_time
        return True

    def build_alert(self, result: Dict[str, Any], track: Optional[Dict[str, Any]], current_time: float, night_mode: bool) -> Dict[str, Any]:
        if night_mode and result["severity"] == "MEDIUM":
            result["severity"] = "HIGH"
            result["reason"] += " (Night-time Alert)"
            
        return {
            "rule_id": result["rule_id"],
            "event_type": result["event_type"],
            "triggered": True,
            "camera_id": self.camera_id,
            "track_id": track["track_id"] if track else -1,
            "object_type": track["class_name"] if track else "group",
            "zone_id": result["zone_id"],
            "timestamp": current_time,
            "severity": result["severity"],
            "reason": result["reason"],
            "confidence": track.get("confidence", 1.0) if track else 1.0,
            "movement_state": track.get("movement_state", "UNKNOWN") if track else "UNKNOWN",
            "direction": track.get("direction", "UNKNOWN") if track else "UNKNOWN",
            "bbox": track.get("bbox", None) if track else None
        }

    def evaluate(self, tracks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        alerts = []
        current_time = time.time()
        night_mode = self.is_night_time()
        
        active_track_ids = {track["track_id"] for track in tracks if track.get("active", True) and "track_id" in track}

        for rule in self.rules:
            if not rule.enabled:
                continue
            try:
                rule.clean_expired_tracks(active_track_ids)
            except Exception as e:
                logger.error(f"Error cleaning expired tracks in rule {rule.rule_id}: {e}")

        for track in tracks:
            if not track.get("active", True):
                continue
                
            for rule in self.rules:
                if not rule.enabled or rule.is_group_rule:
                    continue
                    
                try:
                    result = rule.evaluate(track, current_time)
                    if result and result["triggered"]:
                        if self.check_cooldown(rule.rule_id, rule.zone_id, str(track["track_id"]), current_time):
                            alerts.append(self.build_alert(result, track, current_time, night_mode))
                except Exception as e:
                    logger.error(f"Error evaluating rule {rule.rule_id} for track {track.get('track_id')}: {e}")
                        
        for rule in self.rules:
            if not rule.enabled or not rule.is_group_rule:
                continue
                
            try:
                result = rule.evaluate_group(tracks, current_time)
                if result and result["triggered"]:
                    if self.check_cooldown(rule.rule_id, rule.zone_id, "group", current_time):
                        alerts.append(self.build_alert(result, None, current_time, night_mode))
            except Exception as e:
                logger.error(f"Error evaluating group rule {rule.rule_id}: {e}")
                        
        return alerts
