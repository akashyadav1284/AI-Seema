import cv2
import numpy as np
from typing import Dict, Any

class Annotator:
    @staticmethod
    def draw_detections(frame: np.ndarray, result: Dict[str, Any], source_name: str = "Source") -> np.ndarray:
        annotated_frame = frame.copy()
        
        detections = result.get("detections", [])
        fps = result.get("fps", 0.0)
        quality = result.get("frame_quality", {}).get("quality_state", "UNKNOWN")
        
        # Draw bounding boxes
        for det in detections:
            bbox = det["bbox"]
            class_name = det["class_name"]
            conf = det["confidence"]
            
            x1, y1 = int(bbox["x1"]), int(bbox["y1"])
            x2, y2 = int(bbox["x2"]), int(bbox["y2"])
            
            # Use track_id for unique colors if available
            track_id = det.get("track_id")
            if track_id is not None:
                color = ((track_id * 37) % 255, (track_id * 11) % 255, (track_id * 101) % 255)
                label = f"ID:{track_id} {class_name} {int(conf * 100)}%"
                
                # Draw trajectory history
                trajectory = det.get("trajectory", [])
                for i in range(1, len(trajectory)):
                    pt1 = (int(trajectory[i-1]["x"]), int(trajectory[i-1]["y"]))
                    pt2 = (int(trajectory[i]["x"]), int(trajectory[i]["y"]))
                    cv2.line(annotated_frame, pt1, pt2, color, 2)
                    
                # Movement state
                state = det.get("movement_state", "")
                if state:
                    cv2.putText(annotated_frame, state, (x1, y2 + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
            else:
                color = (0, 255, 0) if class_name == "person" else (255, 0, 0)
                label = f"{class_name} {int(conf * 100)}%"
            
            # Box
            # If an alert was triggered for this track_id, draw it explicitly red
            is_alert = any(a["track_id"] == track_id for a in result.get("alerts", []))
            if is_alert:
                color = (0, 0, 255) # Red for alert
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 3)
                cv2.putText(annotated_frame, "ALERT", (x1, y1 - 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            else:
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            
            # Label
            cv2.putText(annotated_frame, label, (x1, max(y1 - 10, 0)), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Draw Overlay (Header)
        cv2.rectangle(annotated_frame, (0, 0), (350, 110), (0, 0, 0), -1)
        
        cv2.putText(annotated_frame, "IBVAP", (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(annotated_frame, f"Source: {source_name}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        cv2.putText(annotated_frame, f"FPS: {fps:.1f}", (10, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        cv2.putText(annotated_frame, f"Quality: {quality}", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        # Object counts
        counts = {"person": 0, "car": 0, "motorcycle": 0, "bus": 0, "truck": 0}
        for d in detections:
            if d["class_name"] in counts:
                counts[d["class_name"]] += 1
                
        y_offset = 25
        for cls, count in counts.items():
            if count > 0:
                cv2.putText(annotated_frame, f"{cls}: {count}", (360, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                y_offset += 20
                
        return annotated_frame

    @staticmethod
    def draw_rules(frame: np.ndarray, rules: list) -> np.ndarray:
        """
        Draws virtual fences and polygon zones on the frame.
        """
        annotated_frame = frame.copy()
        
        for rule in rules:
            if rule.rule_type == "VIRTUAL_FENCE":
                pt1 = (int(rule.point_a["x"]), int(rule.point_a["y"]))
                pt2 = (int(rule.point_b["x"]), int(rule.point_b["y"]))
                cv2.line(annotated_frame, pt1, pt2, (0, 165, 255), 2) # Orange
                cv2.putText(annotated_frame, rule.zone_id, pt1, cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
                
            elif rule.rule_type == "RESTRICTED_ZONE":
                pts = np.array([[int(p["x"]), int(p["y"])] for p in rule.polygon], np.int32)
                pts = pts.reshape((-1, 1, 2))
                
                # Draw transparent overlay
                overlay = annotated_frame.copy()
                cv2.fillPoly(overlay, [pts], (0, 0, 255))
                cv2.addWeighted(overlay, 0.2, annotated_frame, 0.8, 0, annotated_frame)
                
                # Outline
                cv2.polylines(annotated_frame, [pts], True, (0, 0, 255), 2)
                
                # Label
                center_x = int(np.mean([p["x"] for p in rule.polygon]))
                center_y = int(np.mean([p["y"] for p in rule.polygon]))
                cv2.putText(annotated_frame, rule.zone_id, (center_x - 30, center_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
        return annotated_frame
