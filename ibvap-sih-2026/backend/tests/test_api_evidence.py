import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

from app.main import app
from app.config import settings
from app.services.auth import get_current_user

client = TestClient(app)

@pytest.fixture
def mock_admin_user():
    app.dependency_overrides[get_current_user] = lambda: {"email": "admin@test.com", "role": "admin"}
    yield
    app.dependency_overrides = {}

@pytest.fixture
def mock_no_user():
    app.dependency_overrides = {}

@pytest.fixture
def fake_evidence_dir(tmp_path):
    # Setup safe tmp structure
    snapshots_dir = tmp_path / "snapshots"
    snapshots_dir.mkdir()
    clips_dir = tmp_path / "clips"
    clips_dir.mkdir()
    
    test_snapshot = snapshots_dir / "EVT-123.jpg"
    test_snapshot.write_text("fake image data")
    
    test_clip = clips_dir / "EVT-123.mp4"
    test_clip.write_text("fake video data")
    
    with patch("app.routes.evidence.settings.EVIDENCE_DIR", str(tmp_path)):
        yield str(tmp_path)


def test_get_snapshot_unauthenticated(fake_evidence_dir):
    response = client.get("/api/evidence/snapshots/EVT-123.jpg")
    assert response.status_code == 401

@patch("app.routes.evidence.is_db_connected", return_value=True)
@patch("app.routes.evidence.get_db")
def test_get_snapshot_valid(mock_get_db, mock_is_db, fake_evidence_dir, mock_admin_user):
    mock_db = MagicMock()
    # Path should mathematically be inside fake_evidence_dir
    safe_path = os.path.join(fake_evidence_dir, "snapshots", "EVT-123.jpg")
    mock_db["events"].find_one = AsyncMock(return_value={"event_id": "EVT-123", "snapshot_path": safe_path})
    mock_get_db.return_value = mock_db
    
    response = client.get("/api/evidence/snapshots/EVT-123.jpg")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content == b"fake image data"

@patch("app.routes.evidence.is_db_connected", return_value=True)
@patch("app.routes.evidence.get_db")
def test_get_snapshot_missing_event(mock_get_db, mock_is_db, fake_evidence_dir, mock_admin_user):
    mock_db = MagicMock()
    mock_db["events"].find_one = AsyncMock(return_value=None)
    mock_get_db.return_value = mock_db
    
    response = client.get("/api/evidence/snapshots/EVT-404.jpg")
    assert response.status_code == 404
    assert response.json()["detail"] == "Evidence not found"

@patch("app.routes.evidence.is_db_connected", return_value=True)
@patch("app.routes.evidence.get_db")
def test_get_snapshot_no_path_in_db(mock_get_db, mock_is_db, fake_evidence_dir, mock_admin_user):
    mock_db = MagicMock()
    mock_db["events"].find_one = AsyncMock(return_value={"event_id": "EVT-123", "snapshot_path": None})
    mock_get_db.return_value = mock_db
    
    response = client.get("/api/evidence/snapshots/EVT-123.jpg")
    assert response.status_code == 404

@patch("app.routes.evidence.is_db_connected", return_value=True)
@patch("app.routes.evidence.get_db")
def test_get_snapshot_path_traversal_in_url(mock_get_db, mock_is_db, fake_evidence_dir, mock_admin_user):
    response = client.get("/api/evidence/snapshots/..%2F..%2Fetc%2Fpasswd")
    assert response.status_code in [400, 404]

@patch("app.routes.evidence.is_db_connected", return_value=True)
@patch("app.routes.evidence.get_db")
def test_get_snapshot_path_traversal_in_db(mock_get_db, mock_is_db, fake_evidence_dir, mock_admin_user):
    # This simulates a compromised DB entry where snapshot_path escapes EVIDENCE_DIR
    mock_db = MagicMock()
    evil_path = "/etc/passwd" if os.name != "nt" else "C:\\Windows\\System32\\cmd.exe"
    mock_db["events"].find_one = AsyncMock(return_value={"event_id": "EVT-123", "snapshot_path": evil_path})
    mock_get_db.return_value = mock_db
    
    response = client.get("/api/evidence/snapshots/EVT-123.jpg")
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid evidence reference"
