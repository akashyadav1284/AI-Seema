import pytest
from app.services.rule_engine import RuleEngine, VirtualFenceRule, RestrictedZoneRule, LoiteringRule, WrongDirectionRule, CrowdRule

def test_virtual_fence_crossing():
    engine = RuleEngine("cam_1")
    engine.add_rule(VirtualFenceRule(
        rule_id="R1", zone_id="F1", 
        point_a={"x": 50, "y": 0}, point_b={"x": 50, "y": 100}
    ))
    
    # Not crossing (left side)
    track = {
        "active": True,
        "track_id": 1,
        "class_name": "person",
        "previous_centroid": {"x": 10, "y": 50},
        "centroid": {"x": 40, "y": 50}
    }
    alerts = engine.evaluate([track])
    assert len(alerts) == 0
    
    # Crossing (left to right)
    track["previous_centroid"] = {"x": 40, "y": 50}
    track["centroid"] = {"x": 60, "y": 50}
    alerts = engine.evaluate([track])
    assert len(alerts) == 1
    assert alerts[0]["rule_type"] == "VIRTUAL_FENCE"
    assert alerts[0]["severity"] == "HIGH"

def test_restricted_zone_enter():
    engine = RuleEngine("cam_1")
    polygon = [
        {"x": 10, "y": 10}, {"x": 50, "y": 10},
        {"x": 50, "y": 50}, {"x": 10, "y": 50}
    ]
    engine.add_rule(RestrictedZoneRule("R2", "Z1", polygon, "ENTER"))
    
    # Outside -> Outside
    track = {
        "active": True, "track_id": 2, "class_name": "car",
        "previous_centroid": {"x": 0, "y": 0}, "centroid": {"x": 5, "y": 5}
    }
    alerts = engine.evaluate([track])
    assert len(alerts) == 0
    
    # Outside -> Inside
    track["previous_centroid"] = {"x": 5, "y": 5}
    track["centroid"] = {"x": 20, "y": 20}
    alerts = engine.evaluate([track])
    assert len(alerts) == 1
    assert alerts[0]["rule_type"] == "RESTRICTED_ZONE"
    assert "entered" in alerts[0]["reason"]
    
    # Inside -> Inside (No alert because trigger_on="ENTER")
    track["previous_centroid"] = {"x": 20, "y": 20}
    track["centroid"] = {"x": 30, "y": 30}
    alerts = engine.evaluate([track])
    assert len(alerts) == 0

def test_cooldown_suppression():
    engine = RuleEngine("cam_1")
    engine.add_rule(VirtualFenceRule("R1", "F1", {"x": 50, "y": 0}, {"x": 50, "y": 100}))
    
    track = {
        "active": True, "track_id": 1, "class_name": "person",
        "previous_centroid": {"x": 40, "y": 50}, "centroid": {"x": 60, "y": 50}
    }
    
    # First crossing -> Alert
    alerts = engine.evaluate([track])
    assert len(alerts) == 1
    
    # Frame 2: Let's artificially force intersection again (wobbly movement on line)
    track["previous_centroid"] = {"x": 60, "y": 50}
    track["centroid"] = {"x": 40, "y": 50}
    alerts2 = engine.evaluate([track])
    
    # Blocked by cooldown
    assert len(alerts2) == 0

def test_empty_tracks():
    engine = RuleEngine("cam_1")
    alerts = engine.evaluate([])
    assert len(alerts) == 0

def test_night_time_elevation(monkeypatch):
    engine = RuleEngine("cam_1")
    polygon = [{"x": 0, "y": 0}, {"x": 100, "y": 0}, {"x": 100, "y": 100}, {"x": 0, "y": 100}]
    engine.add_rule(RestrictedZoneRule("R2", "Z1", polygon, "ENTER"))
    
    # Force night mode
    monkeypatch.setattr(engine, "is_night_time", lambda: True)
    
    track = {
        "active": True, "track_id": 1, "class_name": "person",
        "previous_centroid": {"x": -10, "y": 50}, "centroid": {"x": 50, "y": 50}
    }
    alerts = engine.evaluate([track])
    assert len(alerts) == 1
    assert alerts[0]["severity"] == "HIGH"
    assert "Night-time Alert" in alerts[0]["reason"]

def test_loitering_rule():
    engine = RuleEngine("cam_1")
    polygon = [{"x": 0, "y": 0}, {"x": 100, "y": 0}, {"x": 100, "y": 100}, {"x": 0, "y": 100}]
    engine.add_rule(LoiteringRule("R3", "Z1", polygon, threshold_seconds=2))
    
    track = {
        "active": True, "track_id": 1, "class_name": "person", "centroid": {"x": 50, "y": 50}
    }
    
    rule = engine.rules[0]
    
    res1 = rule.evaluate(track, 100.0)
    assert res1 is None
    
    res2 = rule.evaluate(track, 101.0)
    assert res2 is None
    
    res3 = rule.evaluate(track, 102.5) # Exceeded 2.0 seconds!
    assert res3 is not None
    assert res3["triggered"] is True
    assert res3["rule_type"] == "LOITERING"

def test_wrong_direction_rule():
    polygon = [{"x": 0, "y": 0}, {"x": 100, "y": 0}, {"x": 100, "y": 100}, {"x": 0, "y": 100}]
    rule = WrongDirectionRule("R4", "Z1", prohibited_direction="LEFT", polygon=polygon)
    
    # Moving RIGHT (allowed)
    track_right = {"active": True, "track_id": 1, "direction": "RIGHT", "centroid": {"x": 50, "y": 50}}
    assert rule.evaluate(track_right, 100.0) is None
    
    # Moving UNKNOWN
    track_unk = {"active": True, "track_id": 1, "direction": "UNKNOWN", "centroid": {"x": 50, "y": 50}}
    assert rule.evaluate(track_unk, 100.0) is None
    
    # Moving LEFT (prohibited) inside polygon
    track_left = {"active": True, "track_id": 1, "direction": "LEFT", "centroid": {"x": 50, "y": 50}}
    res = rule.evaluate(track_left, 100.0)
    assert res is not None
    assert res["rule_type"] == "WRONG_DIRECTION"
    
    # Moving LEFT (prohibited) but OUTSIDE polygon
    track_left_out = {"active": True, "track_id": 1, "direction": "LEFT", "centroid": {"x": 200, "y": 200}}
    assert rule.evaluate(track_left_out, 100.0) is None

def test_crowd_rule():
    polygon = [{"x": 0, "y": 0}, {"x": 100, "y": 0}, {"x": 100, "y": 100}, {"x": 0, "y": 100}]
    rule = CrowdRule("R5", "Z1", polygon, min_people=2)
    
    # 1 Person
    tracks_1 = [{"active": True, "class_name": "person", "centroid": {"x": 50, "y": 50}}]
    assert rule.evaluate_group(tracks_1, 100.0) is None
    
    # 1 Person, 1 Car
    tracks_mixed = [
        {"active": True, "class_name": "person", "centroid": {"x": 50, "y": 50}},
        {"active": True, "class_name": "car", "centroid": {"x": 60, "y": 60}}
    ]
    assert rule.evaluate_group(tracks_mixed, 100.0) is None
    
    # 2 People (triggers crowd)
    tracks_2 = [
        {"active": True, "class_name": "person", "centroid": {"x": 50, "y": 50}},
        {"active": True, "class_name": "person", "centroid": {"x": 60, "y": 60}}
    ]
    res = rule.evaluate_group(tracks_2, 100.0)
    assert res is not None
    assert res["rule_type"] == "CROWD"
    assert "2 people" in res["reason"]
