import time
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.config import settings
from app.utils.geometry import is_point_in_polygon, lines_intersect

class Rule:
    def __init__(self, rule_id: str, zone_id: str, rule_type: str):
        self.rule_id = rule_id
        self.zone_id = zone_id
        self.rule_type = rule_type
        
    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

class VirtualFenceRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, point_a: Dict[str, float], point_b: Dict[str, float]):
        super().__init__(rule_id, zone_id, "VIRTUAL_FENCE")
        self.point_a = point_a
        self.point_b = point_b

    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        if not track.get("previous_centroid"):
            return None
            
        prev_c = track["previous_centroid"]
        curr_c = track["centroid"]
        
        if lines_intersect(prev_c, curr_c, self.point_a, self.point_b):
            return {
                "rule_id": self.rule_id,
                "rule_type": self.rule_type,
                "triggered": True,
                "zone_id": self.zone_id,
                "reason": f"Object crossed restricted fence {self.zone_id}.",
                "severity": "HIGH"
            }
        return None

class RestrictedZoneRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, polygon: List[Dict[str, float]], trigger_on: str = "ENTER"):
        super().__init__(rule_id, zone_id, "RESTRICTED_ZONE")
        self.polygon = polygon
        self.trigger_on = trigger_on

    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        curr_c = track["centroid"]
        is_inside_now = is_point_in_polygon(curr_c, self.polygon)
        
        is_inside_before = False
        if track.get("previous_centroid"):
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
                "rule_type": self.rule_type,
                "triggered": True,
                "zone_id": self.zone_id,
                "reason": reason,
                "severity": "MEDIUM"
            }
        return None

class LoiteringRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, polygon: List[Dict[str, float]], threshold_seconds: int = None):
        super().__init__(rule_id, zone_id, "LOITERING")
        self.polygon = polygon
        self.threshold_seconds = threshold_seconds or settings.LOITERING_THRESHOLD_SECONDS
        self.entry_times: Dict[int, float] = {}

    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        curr_c = track["centroid"]
        is_inside = is_point_in_polygon(curr_c, self.polygon)
        track_id = track["track_id"]
        
        if is_inside:
            if track_id not in self.entry_times:
                self.entry_times[track_id] = timestamp
            else:
                dwell_time = timestamp - self.entry_times[track_id]
                if dwell_time >= self.threshold_seconds:
                    return {
                        "rule_id": self.rule_id,
                        "rule_type": self.rule_type,
                        "triggered": True,
                        "zone_id": self.zone_id,
                        "reason": f"Object {track_id} loitered in zone {self.zone_id} for {int(dwell_time)} seconds.",
                        "severity": "MEDIUM"
                    }
        else:
            if track_id in self.entry_times:
                del self.entry_times[track_id]
                
        return None

class WrongDirectionRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, prohibited_direction: str, polygon: Optional[List[Dict[str, float]]] = None):
        super().__init__(rule_id, zone_id, "WRONG_DIRECTION")
        self.prohibited_direction = prohibited_direction.upper()
        self.polygon = polygon

    def evaluate(self, track: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        direction = track.get("direction", "UNKNOWN").upper()
        
        if direction == "UNKNOWN" or direction != self.prohibited_direction:
            return None
            
        if self.polygon:
            if not is_point_in_polygon(track["centroid"], self.polygon):
                return None
                
        return {
            "rule_id": self.rule_id,
            "rule_type": self.rule_type,
            "triggered": True,
            "zone_id": self.zone_id,
            "reason": f"Object {track['track_id']} moved in prohibited direction {self.prohibited_direction} in {self.zone_id}.",
            "severity": "HIGH"
        }

class CrowdRule(Rule):
    def __init__(self, rule_id: str, zone_id: str, polygon: List[Dict[str, float]], min_people: int = None):
        super().__init__(rule_id, zone_id, "CROWD")
        self.polygon = polygon
        self.min_people = min_people or settings.CROWD_MIN_PEOPLE

    def evaluate_group(self, tracks: List[Dict[str, Any]], timestamp: float) -> Optional[Dict[str, Any]]:
        people_inside = 0
        for track in tracks:
            if not track.get("active", True) or track.get("class_name") != "person":
                continue
            if is_point_in_polygon(track["centroid"], self.polygon):
                people_inside += 1
                
        if people_inside >= self.min_people:
            return {
                "rule_id": self.rule_id,
                "rule_type": self.rule_type,
                "triggered": True,
                "zone_id": self.zone_id,
                "reason": f"Crowd detected: {people_inside} people inside {self.zone_id}.",
                "severity": "HIGH"
            }
        return None

class RuleEngine:
    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        self.rules: List[Rule] = []
        self.cooldowns: Dict[str, float] = {}
        
    def add_rule(self, rule: Rule):
        self.rules.append(rule)
        
    def is_night_time(self) -> bool:
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

    def check_cooldown(self, zone_id: str, subject_id: str, current_time: float) -> bool:
        key = f"{self.camera_id}_{zone_id}_{subject_id}"
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
            "rule_type": result["rule_type"],
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
            "direction": track.get("direction", "UNKNOWN") if track else "UNKNOWN"
        }

    def evaluate(self, tracks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        alerts = []
        current_time = time.time()
        night_mode = self.is_night_time()
        
        for track in tracks:
            if not track.get("active", True):
                continue
                
            for rule in self.rules:
                if hasattr(rule, "evaluate_group"):
                    continue
                    
                result = rule.evaluate(track, current_time)
                if result and result["triggered"]:
                    if self.check_cooldown(rule.zone_id, str(track["track_id"]), current_time):
                        alerts.append(self.build_alert(result, track, current_time, night_mode))
                        
        for rule in self.rules:
            if hasattr(rule, "evaluate_group"):
                result = rule.evaluate_group(tracks, current_time)
                if result and result["triggered"]:
                    if self.check_cooldown(rule.zone_id, "group", current_time):
                        alerts.append(self.build_alert(result, None, current_time, night_mode))
                        
        return alerts
