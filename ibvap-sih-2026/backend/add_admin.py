import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import connect_to_mongo, close_mongo_connection, get_db
from app.services.auth import get_password_hash

async def main():
    await connect_to_mongo()
    db = get_db()
    if db is None:
        print("Failed to connect to DB")
        return
        
    email = "admin@gov.in"
    password = "pass123"
    
    hashed_password = get_password_hash(password)
    
    user = {
        "email": email,
        "hashed_password": hashed_password,
        "role": "admin",
        "is_active": True,
        "full_name": "System Administrator"
    }
    
    # Use update_one with upsert to avoid duplicate key errors if it already exists
    result = await db["users"].update_one(
        {"email": email},
        {"$set": user},
        upsert=True
    )
    
    if result.upserted_id:
        print(f"User {email} created successfully.")
    else:
        print(f"User {email} updated successfully.")
        
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
