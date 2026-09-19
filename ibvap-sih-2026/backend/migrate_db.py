import os
from pymongo import MongoClient

def migrate_database(source_uri: str, target_uri: str, db_name: str):
    print(f"Connecting to source MongoDB: {source_uri}")
    source_client = MongoClient(source_uri)
    source_db = source_client[db_name]

    print(f"Connecting to target MongoDB: {target_uri}")
    target_client = MongoClient(target_uri)
    target_db = target_client[db_name]

    collections = source_db.list_collection_names()
    if not collections:
        print(f"No collections found in source database '{db_name}'.")
        return

    for coll_name in collections:
        print(f"\nMigrating collection: {coll_name}...")
        source_collection = source_db[coll_name]
        target_collection = target_db[coll_name]

        # Get all documents
        documents = list(source_collection.find())
        count = len(documents)
        print(f"Found {count} documents in '{coll_name}'.")

        if count > 0:
            # Clear target collection (optional, but good for clean migration if we want to overwrite)
            target_collection.delete_many({})
            # Insert documents
            target_collection.insert_many(documents)
            print(f"Successfully inserted {count} documents into target '{coll_name}'.")
        else:
            print(f"Skipping empty collection '{coll_name}'.")

    print("\nDatabase migration completed successfully!")

if __name__ == "__main__":
    # Local URI
    LOCAL_URI = "mongodb://localhost:27017"
    # Target Atlas URI
    ATLAS_URI = "mongodb+srv://akashyadav9992462520_db_user:rdl4DWgYBiA1f1ab@cluster0.cylzfn9.mongodb.net"
    # Database name
    DB_NAME = "ibvap"

    migrate_database(LOCAL_URI, ATLAS_URI, DB_NAME)
