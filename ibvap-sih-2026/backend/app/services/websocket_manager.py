from typing import Dict, Set, Any
from fastapi import WebSocket
import logging
import asyncio

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps a WebSocket connection to its subscribed channels (e.g., "events", "camera:CAM-01")
        self.active_connections: Dict[WebSocket, Set[str]] = {}
        # We also maintain a reverse mapping for faster broadcasting: channel -> Set[WebSocket]
        self.channel_subscribers: Dict[str, Set[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = set()
        logger.info("New WebSocket connection accepted.")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            channels = self.active_connections[websocket]
            for channel in channels:
                if channel in self.channel_subscribers:
                    self.channel_subscribers[channel].discard(websocket)
                    if not self.channel_subscribers[channel]:
                        del self.channel_subscribers[channel]
            del self.active_connections[websocket]
            logger.info("WebSocket disconnected and cleaned up.")

    async def subscribe(self, websocket: WebSocket, channel: str):
        if websocket in self.active_connections:
            self.active_connections[websocket].add(channel)
            if channel not in self.channel_subscribers:
                self.channel_subscribers[channel] = set()
            self.channel_subscribers[channel].add(websocket)
            logger.debug(f"WebSocket subscribed to channel: {channel}")
            
    async def unsubscribe(self, websocket: WebSocket, channel: str):
        if websocket in self.active_connections:
            self.active_connections[websocket].discard(channel)
            if channel in self.channel_subscribers:
                self.channel_subscribers[channel].discard(websocket)

    async def broadcast_event(self, event_dict: Dict[str, Any]):
        """
        Broadcasts an event to global 'events' channel and specific 'camera:{camera_id}' channel.
        """
        camera_id = event_dict.get("camera_id")
        timestamp = event_dict.get("timestamp")
        
        message = {
            "type": "event.created",
            "camera_id": camera_id,
            "timestamp": timestamp,
            "event": event_dict
        }
        
        target_channels = ["events"]
        if camera_id:
            target_channels.append(f"camera:{camera_id}")
            
        target_websockets = set()
        for channel in target_channels:
            if channel in self.channel_subscribers:
                target_websockets.update(self.channel_subscribers[channel])
                
        # Send concurrently
        tasks = []
        for ws in target_websockets:
            tasks.append(self.safe_send(ws, message))
            
        if tasks:
            await asyncio.gather(*tasks)

    async def broadcast_alert(self, alert_dict: Dict[str, Any], msg_type: str):
        """
        Broadcasts an actionable alert to global 'alerts' (or 'events') channel and specific 'camera' channel.
        """
        camera_id = alert_dict.get("camera_id")
        
        message = {
            "type": msg_type,
            "camera_id": camera_id,
            "timestamp": alert_dict.get("created_at"),
            "alert": alert_dict
        }
        
        target_channels = ["events"] # Reusing events global channel for simplicity, as per architecture plan
        if camera_id:
            target_channels.append(f"camera:{camera_id}")
            
        target_websockets = set()
        for channel in target_channels:
            if channel in self.channel_subscribers:
                target_websockets.update(self.channel_subscribers[channel])
                
        tasks = []
        for ws in target_websockets:
            tasks.append(self.safe_send(ws, message))
            
        if tasks:
            await asyncio.gather(*tasks)

    async def safe_send(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message to websocket: {e}")
            self.disconnect(websocket)

# Singleton manager
websocket_manager = ConnectionManager()
