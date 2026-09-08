import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app

def check_api():
    print("Testing Live API against Local MongoDB...")
    with TestClient(app) as client:
        # 1. Get all events
        response = client.get("/api/events/")
        if response.status_code == 200:
            data = response.json()
            total = data.get("total", 0)
            items = data.get("items", [])
            print(f"SUCCESS: GET /api/events/ returned HTTP 200. Total Events: {total}")
            
            if total > 0:
                first_event = items[0]
                event_id = first_event["event_id"]
                print(f"Sample Event ID: {event_id}")
                
                # 2. Get event by ID
                res_id = client.get(f"/api/events/{event_id}")
                if res_id.status_code == 200:
                    print(f"SUCCESS: GET /api/events/{event_id} returned HTTP 200.")
                    print(f"Event Data: {res_id.json()['event_type']} - Confidence: {res_id.json()['confidence']}")
                    
                    # 3. Patch Review
                    res_patch = client.patch(f"/api/events/{event_id}/review", json={"status": "VERIFIED", "notes": "E2E Tested"})
                    if res_patch.status_code == 200:
                        print(f"SUCCESS: PATCH /api/events/{event_id}/review returned HTTP 200.")
                        print(f"Updated Status: {res_patch.json()['status']}")
                    else:
                        print(f"FAIL: PATCH returned {res_patch.status_code}")
                else:
                    print(f"FAIL: GET ID returned {res_id.status_code}")
        else:
            print(f"FAIL: GET returned {response.status_code}")

if __name__ == "__main__":
    check_api()
