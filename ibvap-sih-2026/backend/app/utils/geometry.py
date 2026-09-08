from typing import List, Dict

def is_point_in_polygon(point: Dict[str, float], polygon: List[Dict[str, float]]) -> bool:
    """
    Ray-Casting algorithm to determine if a point is inside a polygon.
    """
    x, y = point["x"], point["y"]
    inside = False
    
    n = len(polygon)
    if n < 3:
        return False
        
    p1x, p1y = polygon[0]["x"], polygon[0]["y"]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]["x"], polygon[i % n]["y"]
        
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
        
    return inside

def ccw(A: Dict[str, float], B: Dict[str, float], C: Dict[str, float]) -> bool:
    """
    Check if three points are listed in a counterclockwise order.
    """
    return (C["y"] - A["y"]) * (B["x"] - A["x"]) > (B["y"] - A["y"]) * (C["x"] - A["x"])

def lines_intersect(A: Dict[str, float], B: Dict[str, float], C: Dict[str, float], D: Dict[str, float]) -> bool:
    """
    Check if line segment AB intersects line segment CD.
    """
    return ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D)
