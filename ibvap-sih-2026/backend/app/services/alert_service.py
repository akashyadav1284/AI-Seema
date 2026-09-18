import time
import uuid
import logging
from pymongo.errors import DuplicateKeyError
from typing import Optional, Dict, Any, Tuple

from app.models.event import SecurityEvent
from app.models.alert import SecurityAlert
from app.database import get_db, is_db_connected
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)

class AlertService:
    def generate_alert_id(self) -> str:
        return f"ALT-{int(time.time())}-{str(uuid.uuid4())[:6].upper()}"

    async def process_event(self, event: SecurityEvent):
        """
        Evaluate if an event should become an alert. If so, create and broadcast it.
        """
        # Criteria for alert generation
        if event.severity not in ["HIGH", "MEDIUM"]:
            return

        alert_id = self.generate_alert_id()
        
        # Build the alert
        alert = SecurityAlert(
            alert_id=alert_id,
            event_id=event.event_id,
            camera_id=event.camera_id,
            alert_type=event.event_type,
            severity=event.severity,
            status="NEW",
            message=event.reason,
            created_at=time.time()
        )
        
        # Save to DB
        saved = await self._save_alert_to_db(alert)
        if saved:
            # Broadcast the alert via WebSocket
            import asyncio
            asyncio.create_task(websocket_manager.broadcast_alert(alert.model_dump(), "alert.created"))

    async def _save_alert_to_db(self, alert: SecurityAlert) -> bool:
        if not is_db_connected():
            return False
            
        db = get_db()
        try:
            await db["alerts"].insert_one(alert.model_dump())
            return True
        except DuplicateKeyError:
            # Idempotency: Event was already promoted to an alert
            logger.info(f"Alert for event {alert.event_id} already exists.")
            return False
        except Exception as e:
            logger.error(f"Failed to save alert {alert.alert_id}: {e}")
            return False

    async def get_alerts(self, skip: int = 0, limit: int = 50, filters: Dict[str, Any] = None) -> Tuple[list, int]:
        if not is_db_connected():
            return [], 0
            
        db = get_db()
        query = filters or {}
        
        cursor = db["alerts"].find(query).sort("created_at", -1).skip(skip).limit(limit)
        items = [SecurityAlert(**doc) async for doc in cursor]
        total = await db["alerts"].count_documents(query)
        
        return items, total

    async def get_alert_by_id(self, alert_id: str) -> Optional[SecurityAlert]:
        if not is_db_connected():
            return None
            
        db = get_db()
        doc = await db["alerts"].find_one({"alert_id": alert_id})
        if doc:
            return SecurityAlert(**doc)
        return None

    async def update_alert_status(self, alert_id: str, new_status: str, user_email: str) -> Optional[SecurityAlert]:
        if not is_db_connected():
            return None
            
        db = get_db()
        
        # Fetch current
        doc = await db["alerts"].find_one({"alert_id": alert_id})
        if not doc:
            raise ValueError("Alert not found")
            
        current_status = doc.get("status", "NEW")
        
        # Validate lifecycle
        if new_status == "ACKNOWLEDGED":
            if current_status != "NEW":
                raise ValueError(f"Cannot acknowledge alert from state {current_status}")
        elif new_status == "RESOLVED":
            if current_status not in ["NEW", "ACKNOWLEDGED"]:
                raise ValueError(f"Cannot resolve alert from state {current_status}")
        else:
            raise ValueError(f"Invalid status: {new_status}")
            
        # Prepare updates
        now = time.time()
        updates = {"status": new_status}
        
        if new_status == "ACKNOWLEDGED":
            updates["acknowledged_at"] = now
            updates["acknowledged_by"] = user_email
        elif new_status == "RESOLVED":
            updates["resolved_at"] = now
            updates["resolved_by"] = user_email
            
        # Apply update
        result = await db["alerts"].find_one_and_update(
            {"alert_id": alert_id},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            alert = SecurityAlert(**result)
            msg_type = "alert.acknowledged" if new_status == "ACKNOWLEDGED" else "alert.resolved"
            import asyncio
            asyncio.create_task(websocket_manager.broadcast_alert(alert.model_dump(), msg_type))
            return alert
            
        return None

alert_service = AlertService()
