import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.config_service import ConfigService

@pytest.fixture
def mock_db():
    with patch("app.services.config_service.is_db_connected", return_value=True), \
         patch("app.services.config_service.get_db") as mock_get_db:
        
        mock_db_instance = MagicMock()
        mock_get_db.return_value = mock_db_instance
        yield mock_db_instance

@pytest.mark.anyio
async def test_get_camera_config_connected(mock_db):
    mock_collection = MagicMock()
    mock_collection.find_one = AsyncMock(return_value={"camera_id": "cam_1", "source_type": "rtsp", "source": "rtsp://test"})
    mock_db.__getitem__.return_value = mock_collection
    
    result = await ConfigService.get_camera_config("cam_1")
    assert result is not None
    assert result["source_type"] == "rtsp"
    assert result["camera_id"] == "cam_1"

@pytest.mark.anyio
@patch("app.services.config_service.is_db_connected", return_value=False)
async def test_get_camera_config_disconnected(mock_is_connected):
    result = await ConfigService.get_camera_config("cam_1")
    assert result is None

@pytest.mark.anyio
async def test_get_zones(mock_db):
    mock_collection = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[{"zone_id": "z1", "polygon": [{"x":0,"y":0}]}])
    mock_collection.find.return_value = mock_cursor
    mock_db.__getitem__.return_value = mock_collection
    
    zones = await ConfigService.get_zones("cam_1")
    assert len(zones) == 1
    assert zones[0]["zone_id"] == "z1"

@pytest.mark.anyio
async def test_get_fences(mock_db):
    mock_collection = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[{"fence_id": "f1", "line": [{"x":0,"y":0}, {"x":1,"y":1}]}])
    mock_collection.find.return_value = mock_cursor
    mock_db.__getitem__.return_value = mock_collection
    
    fences = await ConfigService.get_fences("cam_1")
    assert len(fences) == 1
    assert fences[0]["fence_id"] == "f1"
