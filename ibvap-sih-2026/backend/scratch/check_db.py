import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.ibvap
    events = await db.events.find({'camera_id': 'TEST-CAM-01'}).to_list(length=10)
    print(f'Found {len(events)} events')
    if len(events) > 0:
        event = events[0]
        # Remove objectId for printing
        event['_id'] = str(event['_id'])
        print(f"Sample Event: {event}")

    alerts = await db.alerts.find({'camera_id': 'TEST-CAM-01'}).to_list(length=10)
    print(f'Found {len(alerts)} alerts')
    if len(alerts) > 0:
        alert = alerts[0]
        alert['_id'] = str(alert['_id'])
        print(f"Sample Alert: {alert}")

asyncio.run(check())
