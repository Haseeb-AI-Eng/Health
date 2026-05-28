"""
MongoDB Migration Script
Dumps data from local MongoDB to live MongoDB Atlas
"""

import os
import sys
import pymongo
from pymongo import MongoClient
from dotenv import load_dotenv
import json
from bson import ObjectId
from datetime import datetime

# Load environment variables
load_dotenv()

LOCAL_MONGODB_URL = os.getenv('LOCAL_MONGODB_URL', 'mongodb://localhost:27017/')
LIVE_MONGODB_URL = os.getenv('LIVE_MONGODB_URL')
LOCAL_DB_NAME = os.getenv('MONGODB_LOCAL_DB', 'local')
LIVE_DB_NAME = os.getenv('MONGODB_LIVE_DB', 'local')

if not LIVE_MONGODB_URL:
    print("❌ ERROR: LIVE_MONGODB_URL not found in .env file")
    sys.exit(1)

class MongoDBMigrator:
    def __init__(self, local_url, live_url, local_db, live_db):
        self.local_url = local_url
        self.live_url = live_url
        self.local_db_name = local_db
        self.live_db_name = live_db
        
        self.local_client = None
        self.live_client = None
        self.local_db = None
        self.live_db = None
        
    def connect(self):
        """Connect to both MongoDB instances"""
        try:
            print("🔗 Connecting to local MongoDB...")
            self.local_client = MongoClient(self.local_url, serverSelectionTimeoutMS=5000)
            # Test connection
            self.local_client.admin.command('ping')
            self.local_db = self.local_client[self.local_db_name]
            print("✅ Connected to local MongoDB")
        except Exception as e:
            print(f"❌ Failed to connect to local MongoDB: {e}")
            return False
        
        try:
            print("🔗 Connecting to live MongoDB Atlas...")
            self.live_client = MongoClient(self.live_url, serverSelectionTimeoutMS=5000)
            # Test connection
            self.live_client.admin.command('ping')
            self.live_db = self.live_client[self.live_db_name]
            print("✅ Connected to live MongoDB Atlas")
        except Exception as e:
            print(f"❌ Failed to connect to live MongoDB Atlas: {e}")
            return False
        
        return True
    
    def get_collections(self):
        """Get all collections from local database"""
        try:
            collections = self.local_db.list_collection_names()
            return collections
        except Exception as e:
            print(f"❌ Error listing collections: {e}")
            return []
    
    def migrate_collection(self, collection_name):
        """Migrate a single collection from local to live"""
        try:
            local_collection = self.local_db[collection_name]
            live_collection = self.live_db[collection_name]
            
            # Get document count
            doc_count = local_collection.count_documents({})
            print(f"\n📦 Migrating collection '{collection_name}' ({doc_count} documents)...")
            
            if doc_count == 0:
                print(f"   ⏭️  Skipping empty collection")
                return 0
            
            # Fetch all documents
            documents = list(local_collection.find({}))
            
            # Delete existing documents in live collection (optional)
            # Uncomment if you want to replace instead of append
            live_collection.delete_many({})
            
            # Insert documents to live database
            if documents:
                result = live_collection.insert_many(documents)
                print(f"   ✅ Migrated {len(result.inserted_ids)} documents to live MongoDB")
                return len(result.inserted_ids)
            
            return 0
            
        except Exception as e:
            print(f"❌ Error migrating collection '{collection_name}': {e}")
            return 0
    
    def get_migration_stats(self):
        """Get statistics about both databases"""
        try:
            local_stats = {
                'url': self.local_url,
                'database': self.local_db_name,
                'collections': len(self.get_collections()),
                'collections_list': self.get_collections()
            }
            
            local_docs = 0
            for collection in local_stats['collections_list']:
                count = self.local_db[collection].count_documents({})
                local_docs += count
            
            local_stats['total_documents'] = local_docs
            
            return local_stats
        except Exception as e:
            print(f"Error getting stats: {e}")
            return None
    
    def migrate_all(self):
        """Migrate all collections"""
        if not self.connect():
            return False
        
        print("\n" + "="*60)
        print("📊 MIGRATION SUMMARY")
        print("="*60)
        
        # Get stats before migration
        local_stats = self.get_migration_stats()
        if local_stats:
            print(f"\n📍 Local MongoDB:")
            print(f"   URL: {self.local_url}")
            print(f"   Database: {self.local_db_name}")
            print(f"   Collections: {local_stats['collections']}")
            print(f"   Total Documents: {local_stats['total_documents']}")
            print(f"\n   Collections: {', '.join(local_stats['collections_list'])}")
        
        print(f"\n📍 Live MongoDB Atlas:")
        print(f"   Database: {self.live_db_name}")
        print(f"   Target URL: mongodb+srv://[***]@mitdb.xrxuxql.mongodb.net")
        
        print("\n" + "="*60)
        print("🚀 STARTING MIGRATION")
        print("="*60)
        
        collections = self.get_collections()
        total_migrated = 0
        
        if not collections:
            print("❌ No collections found in local database")
            return False
        
        for collection_name in collections:
            migrated = self.migrate_collection(collection_name)
            total_migrated += migrated
        
        print("\n" + "="*60)
        print("✅ MIGRATION COMPLETE")
        print("="*60)
        print(f"Total documents migrated: {total_migrated}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        return True
    
    def disconnect(self):
        """Close database connections"""
        if self.local_client:
            self.local_client.close()
            print("\n✅ Closed local MongoDB connection")
        
        if self.live_client:
            self.live_client.close()
            print("✅ Closed live MongoDB Atlas connection")


def main():
    print("\n🌍 MongoDB Migration Tool")
    print("=" * 60)
    
    migrator = MongoDBMigrator(
        LOCAL_MONGODB_URL,
        LIVE_MONGODB_URL,
        LOCAL_DB_NAME,
        LIVE_DB_NAME
    )
    
    try:
        success = migrator.migrate_all()
        if not success:
            print("❌ Migration failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        migrator.disconnect()


if __name__ == "__main__":
    main()
