from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["healthy", "degraded"]
    assert data["service"] == "ibvap-backend"
    assert "database" in data
    assert data["database"] in ["connected", "disconnected"]

def test_get_cameras_placeholder():
    response = client.get("/api/cameras/")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}

def test_create_camera_validation():
    # Test missing fields
    response = client.post("/api/cameras/", json={})
    assert response.status_code == 422 # Validation error

    # Test invalid source_type
    response = client.post("/api/cameras/", json={
        "name": "Test Cam",
        "camera_id": "cam-01",
        "source_type": "invalid_type",
        "source": "http://test"
    })
    assert response.status_code == 422
