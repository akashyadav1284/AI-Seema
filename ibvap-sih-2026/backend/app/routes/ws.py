import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt

from app.config import settings
from app.services.websocket_manager import websocket_manager
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])

async def get_ws_current_user(token: str):
    """
    Authenticate WebSocket connection via JWT query parameter.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
        
    db = get_db()
    if not db:
        return None
        
    user = await db["users"].find_one({"email": email})
    if user is None or not user.get("is_active", True):
        return None
        
    return user

@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return
        
    user = await get_ws_current_user(token)
    if not user:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return
        
    await websocket_manager.connect(websocket)
    
    try:
        while True:
            # Wait for any messages from the client
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                channel = message.get("channel")
                
                if msg_type == "subscribe" and channel:
                    await websocket_manager.subscribe(websocket, channel)
                    await websocket.send_json({"type": "subscribed", "channel": channel})
                elif msg_type == "unsubscribe" and channel:
                    await websocket_manager.unsubscribe(websocket, channel)
                    await websocket.send_json({"type": "unsubscribed", "channel": channel})
                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                logger.warning("Received non-JSON message on WebSocket")
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
