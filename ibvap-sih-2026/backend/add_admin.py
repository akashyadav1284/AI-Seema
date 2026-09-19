import asyncio
import os
import sys
import datetime

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
        "password_hash": hashed_password,
        "role": "admin",
        "is_active": True,
        "name": "System Administrator",
        "_id": "USR-ADMIN",
        "created_at": datetime.datetime.utcnow().isoformat(),
        "updated_at": datetime.datetime.utcnow().isoformat()
    }
    
    # Delete existing user to avoid _id immutability errors
    await db["users"].delete_many({"email": email})
    result = await db["users"].insert_one(user)
    
    if result.inserted_id:
        print(f"User {email} created successfully.")
    else:
        print(f"Failed to create user {email}.")
        
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
