#!/usr/bin/env python3
"""
Quick Setup and Verification Script for MongoDB Migration
Tests connectivity and displays database information
"""

import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def test_connection(url, name):
    """Test connection to MongoDB"""
    try:
        print(f"\n🔗 Testing {name}...")
        client = MongoClient(url, serverSelectionTimeoutMS=3000)
        client.admin.command('ping')
        print(f"✅ Successfully connected to {name}")
        return client
    except Exception as e:
        print(f"❌ Failed to connect to {name}: {e}")
        return None

def show_database_info(client, db_name, label):
    """Display database information"""
    try:
        db = client[db_name]
        collections = db.list_collection_names()
        
        print(f"\n📊 {label} Database: '{db_name}'")
        print(f"   Collections: {len(collections)}")
        
        total_docs = 0
        for col_name in collections:
            count = db[col_name].count_documents({})
            total_docs += count
            print(f"   ├─ {col_name}: {count} documents")
        
        print(f"   └─ Total: {total_docs} documents")
        
    except Exception as e:
        print(f"❌ Error reading database: {e}")

def main():
    print("="*60)
    print("MongoDB Setup & Verification Tool")
    print("="*60)
    
    # Load environment variables
    local_url = os.getenv('LOCAL_MONGODB_URL', 'mongodb://localhost:27017/')
    live_url = os.getenv('LIVE_MONGODB_URL')
    active_url = os.getenv('MONGODB_URL', local_url)
    
    if not live_url:
        print("\n❌ LIVE_MONGODB_URL not configured in .env")
        sys.exit(1)
    
    print(f"\n📍 Configuration:")
    print(f"   Local URL: {local_url}")
    print(f"   Live URL: {'✓ Configured' if live_url else '✗ Missing'}")
    print(f"   Active URL: {'Local' if active_url == local_url else 'Live'}")
    
    # Test local connection
    local_client = test_connection(local_url, "Local MongoDB")
    if local_client:
        show_database_info(local_client, 'local', 'Local')
        show_database_info(local_client, 'dbfull', 'Local')
        local_client.close()
    
    # Test live connection
    live_client = test_connection(live_url, "Live MongoDB Atlas")
    if live_client:
        show_database_info(live_client, 'local', 'Live')
        show_database_info(live_client, 'dbfull', 'Live')
        live_client.close()
    
    # Recommendations
    print("\n" + "="*60)
    print("📋 Recommendations:")
    print("="*60)
    
    if local_client and live_client:
        print("\n✅ Both connections working!")
        print("\nNext steps:")
        print("1. Run: python migrate_mongodb.py")
        print("2. Verify data migration completed")
        print("3. Switch MONGODB_URL to live in .env when ready")
    elif local_client:
        print("\n⚠️  Local MongoDB is available but Live is not")
        print("Make sure:")
        print("- LIVE_MONGODB_URL is correct in .env")
        print("- MongoDB Atlas cluster is running")
        print("- Your IP is whitelisted in MongoDB Atlas")
    elif live_client:
        print("\n⚠️  Live MongoDB is available but Local is not")
        print("Make sure MongoDB is running locally:")
        print("- Windows: Run 'mongod'")
        print("- Docker: docker run -d -p 27017:27017 mongo:latest")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    main()
