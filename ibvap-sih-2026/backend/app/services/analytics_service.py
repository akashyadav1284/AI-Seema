import datetime
from typing import Dict, Any, List, Optional
from datetime import timezone

from app.database import get_db

class AnalyticsService:

    async def get_summary_metrics(self) -> Dict[str, Any]:
        db = get_db()
        
        # Parallel counts for efficiency
        # We use empty find() since count_documents({}) is optimized in Mongo
        total_cameras = await db["cameras"].count_documents({})
        active_cameras = await db["cameras"].count_documents({"status": "active"})
        
        total_events = await db["events"].count_documents({})
        total_alerts = await db["alerts"].count_documents({})
        
        unresolved_alerts = await db["alerts"].count_documents({"status": "NEW"})
        acknowledged_alerts = await db["alerts"].count_documents({"status": "ACKNOWLEDGED"})
        resolved_alerts = await db["alerts"].count_documents({"status": "RESOLVED"})
        
        return {
            "total_cameras": total_cameras,
            "active_cameras": active_cameras,
            "total_events": total_events,
            "total_alerts": total_alerts,
            "unresolved_alerts": unresolved_alerts,
            "acknowledged_alerts": acknowledged_alerts,
            "resolved_alerts": resolved_alerts
        }

    async def get_event_analytics(
        self, 
        start_time: Optional[float] = None, 
        end_time: Optional[float] = None, 
        camera_id: Optional[str] = None, 
        severity: Optional[str] = None
    ) -> Dict[str, Any]:
        db = get_db()
        
        match_stage = {}
        if start_time is not None or end_time is not None:
            match_stage["timestamp"] = {}
            if start_time is not None:
                match_stage["timestamp"]["$gte"] = start_time
            if end_time is not None:
                match_stage["timestamp"]["$lte"] = end_time
                
        if camera_id:
            match_stage["camera_id"] = camera_id
        if severity:
            match_stage["severity"] = severity
            
        pipeline = []
        if match_stage:
            pipeline.append({"$match": match_stage})
            
        pipeline.append({
            "$facet": {
                "by_type": [
                    {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}}
                ],
                "by_severity": [
                    {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}}
                ],
                "by_camera": [
                    {"$group": {"_id": "$camera_id", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}}
                ]
            }
        })
        
        cursor = db["events"].aggregate(pipeline)
        result = await cursor.to_list(length=1)
        
        if not result:
            return {"by_type": [], "by_severity": [], "by_camera": []}
            
        facets = result[0]
        
        return {
            "by_type": [{"name": str(item["_id"]), "count": item["count"]} for item in facets.get("by_type", [])],
            "by_severity": [{"name": str(item["_id"]), "count": item["count"]} for item in facets.get("by_severity", [])],
            "by_camera": [{"name": str(item["_id"]), "count": item["count"]} for item in facets.get("by_camera", [])]
        }

    async def get_event_trends(
        self,
        start_time: float,
        end_time: float,
        interval: str
    ) -> Dict[str, Any]:
        db = get_db()
        
        # Determine divisor based on interval (timestamp is in seconds)
        if interval == "hour":
            divisor = 3600
        elif interval == "day":
            divisor = 86400
        elif interval == "week":
            divisor = 604800
        else:
            divisor = 86400  # Default to day
            
        pipeline = [
            {"$match": {"timestamp": {"$gte": start_time, "$lte": end_time}}},
            {
                "$group": {
                    "_id": {
                        "$multiply": [
                            {"$floor": {"$divide": ["$timestamp", divisor]}},
                            divisor
                        ]
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        cursor = db["events"].aggregate(pipeline)
        results = await cursor.to_list(length=None)
        
        total = sum(item["count"] for item in results)
        
        items = []
        for item in results:
            dt = datetime.datetime.fromtimestamp(item["_id"], tz=timezone.utc)
            items.append({
                "timestamp": dt.isoformat(),
                "count": item["count"]
            })
            
        return {
            "items": items,
            "total": total
        }

    async def get_alert_analytics(self) -> Dict[str, Any]:
        db = get_db()
        
        total_alerts = await db["alerts"].count_documents({})
        new_alerts = await db["alerts"].count_documents({"status": "NEW"})
        acknowledged_alerts = await db["alerts"].count_documents({"status": "ACKNOWLEDGED"})
        resolved_alerts = await db["alerts"].count_documents({"status": "RESOLVED"})
        
        pipeline = [
            {
                "$facet": {
                    "by_severity": [
                        {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}}
                    ],
                    "by_camera": [
                        {"$group": {"_id": "$camera_id", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}}
                    ]
                }
            }
        ]
        
        cursor = db["alerts"].aggregate(pipeline)
        result = await cursor.to_list(length=1)
        
        if not result:
            severity_dist = []
            camera_dist = []
        else:
            facets = result[0]
            severity_dist = [{"name": str(item["_id"]), "count": item["count"]} for item in facets.get("by_severity", [])]
            camera_dist = [{"name": str(item["_id"]), "count": item["count"]} for item in facets.get("by_camera", [])]
            
        return {
            "total_alerts": total_alerts,
            "new_alerts": new_alerts,
            "acknowledged_alerts": acknowledged_alerts,
            "resolved_alerts": resolved_alerts,
            "severity_distribution": severity_dist,
            "camera_distribution": camera_dist
        }

analytics_service = AnalyticsService()
