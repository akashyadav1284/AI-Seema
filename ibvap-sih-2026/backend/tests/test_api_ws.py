import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

from app.main import app
from app.services.websocket_manager import websocket_manager

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_ws_manager():
    # Reset singleton before every test
    websocket_manager.active_connections.clear()
    websocket_manager.channel_subscribers.clear()
    yield
    websocket_manager.active_connections.clear()
    websocket_manager.channel_subscribers.clear()

from fastapi.websockets import WebSocketDisconnect

def test_ws_no_token():
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/api/ws/"):
            pass
    assert exc.value.code == 1008

@patch("app.routes.ws.get_ws_current_user", new_callable=AsyncMock)
def test_ws_invalid_token(mock_get_user):
    mock_get_user.return_value = None
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/api/ws/?token=invalid"):
            pass
    assert exc.value.code == 1008

@patch("app.routes.ws.get_ws_current_user", new_callable=AsyncMock)
def test_ws_connect_and_subscribe(mock_get_user):
    mock_get_user.return_value = {"email": "test@test.com", "role": "admin", "is_active": True}
    
    with client.websocket_connect("/api/ws/?token=valid_token") as websocket:
        assert len(websocket_manager.active_connections) == 1
        
        # Subscribe to global events
        websocket.send_json({"type": "subscribe", "channel": "events"})
        data = websocket.receive_json()
        assert data == {"type": "subscribed", "channel": "events"}
        assert "events" in websocket_manager.channel_subscribers
        
        # Subscribe to camera specific
        websocket.send_json({"type": "subscribe", "channel": "camera:CAM-01"})
        data = websocket.receive_json()
        assert data == {"type": "subscribed", "channel": "camera:CAM-01"}
        
        # Unsubscribe
        websocket.send_json({"type": "unsubscribe", "channel": "events"})
        data = websocket.receive_json()
        assert data == {"type": "unsubscribed", "channel": "events"}

@pytest.mark.anyio
async def test_ws_broadcast_event():
    # Setup mock websockets
    ws1 = MagicMock()
    ws2 = MagicMock()
    
    # We use AsyncMock for safe_send to verify it was called
    with patch.object(websocket_manager, 'safe_send', new_callable=AsyncMock) as mock_safe_send:
        # Mock active connections
        websocket_manager.active_connections[ws1] = {"events"}
        websocket_manager.active_connections[ws2] = {"camera:CAM-01"}
        websocket_manager.channel_subscribers["events"] = {ws1}
        websocket_manager.channel_subscribers["camera:CAM-01"] = {ws2}
        
        test_event = {
            "camera_id": "CAM-01",
            "timestamp": 1234.5,
            "event_id": "EVT-1"
        }
        
        # Call broadcast
        await websocket_manager.broadcast_event(test_event)
        
        # Both ws1 (global) and ws2 (camera:CAM-01) should get it
        assert mock_safe_send.call_count == 2
        
        # Now test with an event for CAM-02
        mock_safe_send.reset_mock()
        test_event_2 = {
            "camera_id": "CAM-02",
            "timestamp": 1234.6,
            "event_id": "EVT-2"
        }
        await websocket_manager.broadcast_event(test_event_2)
        
        # Only ws1 (global) should get it
        assert mock_safe_send.call_count == 1
        args, kwargs = mock_safe_send.call_args
        assert args[0] == ws1
