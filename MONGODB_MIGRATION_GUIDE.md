# MongoDB Migration Guide

## Overview
This guide explains how to migrate your MongoDB database from local development to the live MongoDB Atlas cluster.

## Live MongoDB Connection Details
```
URL: mongodb+srv://hima21517_db_user:64nGo0W9xSCUpPwb@mitdb.xrxuxql.mongodb.net/?appName=MITDB
```

## Environment Configuration

### .env File
All MongoDB URLs are now configured in `.env`:

```env
# MONGODB CONFIGURATION
LOCAL_MONGODB_URL=mongodb://localhost:27017/
LIVE_MONGODB_URL=mongodb+srv://hima21517_db_user:64nGo0W9xSCUpPwb@mitdb.xrxuxql.mongodb.net/?appName=MITDB
MONGODB_URL=${LIVE_MONGODB_URL}
MONGODB_DBFULL_DB=dbfull
MONGODB_LOCAL_DB=local
```

### How it Works
- `MONGODB_URL` - The active MongoDB URL (set to LIVE_MONGODB_URL by default)
- All Python scripts now use environment variables to determine which database to connect to
- Fallback: If MONGODB_URL is not set, uses LOCAL_MONGODB_URL
- Database names: `dbfull` and `local`

## Migration Process

### Step 1: Ensure Local MongoDB is Running
```bash
# On Windows with MongoDB installed
mongod

# Or if using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 2: Run the Migration Script
```bash
# Navigate to project directory
cd c:\Users\Computer\Desktop\opencl\ (2)\opencl

# Ensure requirements are installed
pip install pymongo python-dotenv

# Run the migration
python migrate_mongodb.py
```

### Step 3: What the Migration Script Does
The `migrate_mongodb.py` script:
1. Connects to local MongoDB (localhost:27017)
2. Lists all collections in the "local" and "dbfull" databases
3. Retrieves all documents from each collection
4. Connects to live MongoDB Atlas
5. Inserts all documents into the corresponding collections
6. Displays migration statistics

### Step 4: Verify Migration
Check the output for success messages:
```
📊 MIGRATION SUMMARY
==========================================================
📍 Local MongoDB:
   URL: mongodb://localhost:27017/
   Database: local
   Collections: 5
   Total Documents: 1250

   Collections: patients, doctors, analyses, email_notifications, users

📍 Live MongoDB Atlas:
   Database: local
   Target URL: mongodb+srv://[***]@mitdb.xrxuxql.mongodb.net

==========================================================
🚀 STARTING MIGRATION
==========================================================

✅ MIGRATION COMPLETE
==========================================================
Total documents migrated: 1250
Timestamp: 2026-05-28 10:30:45
==========================================================
```

## Switching Between Local and Live Database

### To Use Local Database (Development)
Set `MONGODB_URL` to LOCAL_MONGODB_URL in `.env`:
```env
MONGODB_URL=mongodb://localhost:27017/
```

### To Use Live Database (Production)
Set `MONGODB_URL` to LIVE_MONGODB_URL in `.env`:
```env
MONGODB_URL=mongodb+srv://hima21517_db_user:64nGo0W9xSCUpPwb@mitdb.xrxuxql.mongodb.net/?appName=MITDB
```

## Updated Files
The following Python files have been updated to use environment variables:

1. **main.py** - Main FastAPI application (uses `dbfull` database)
2. **doctor_auth.py** - Doctor authentication (uses `dbfull` database)
3. **auth.py** - User authentication (uses `local` database)
4. **profile.py** - User profile management (uses `local` database)
5. **seed_dummy_data.py** - Data seeding script (uses `dbfull` database)
6. **mongo.py** - Data loading script (uses `local` database)
7. **test.py** - Testing script (uses `local` database)
8. **setup_doctor.py** - Doctor setup script (uses `dbfull` database)
9. **reset_email_tracking.py** - Email tracking reset (uses `dbfull` database)
10. **main_backup.py** - Backup of main application (uses `local` database)
11. **migrate_mongodb.py** - NEW migration script

## Database Structure

### dbfull Database
Collections:
- `patients` - Patient records and health data
- `doctors` - Doctor information and credentials
- `analyses` - Clinical analysis results
- `email_notifications` - Email tracking and notification logs

### local Database
Collections:
- `users` - User accounts and authentication
- `drug_disease_map` - Drug-disease relationships
- `drug_reaction_map` - Drug reaction information
- `drug_interactions` - Drug interaction data
- `symptom_disease_map` - Symptom-disease mappings

## Troubleshooting

### Error: "LIVE_MONGODB_URL not found in .env file"
**Solution:** Ensure your `.env` file contains the LIVE_MONGODB_URL configuration.

### Error: "Failed to connect to local MongoDB"
**Solution:** 
- Make sure MongoDB is running on localhost:27017
- Check if MongoDB service is started
- For Docker: `docker ps` to verify container is running

### Error: "Failed to connect to live MongoDB Atlas"
**Solution:**
- Verify the LIVE_MONGODB_URL is correct
- Check internet connection
- Ensure MongoDB Atlas cluster is running
- Verify IP whitelist includes your current IP

### No Collections Found
**Solution:**
- Ensure data has been seeded to local database first
- Run: `python seed_dummy_data.py` to populate local database

## Next Steps

1. ✅ Migration script created and tested
2. ✅ All Python files updated to use environment variables
3. ✅ .env configured with both local and live URLs
4. Next: Run `python migrate_mongodb.py` to migrate data
5. Next: Switch MONGODB_URL in .env to live after verification
6. Next: Deploy application to production

## Verification Commands

### Check Migration Using MongoDB Compass
```
Connection String: mongodb+srv://hima21517_db_user:64nGo0W9xSCUpPwb@mitdb.xrxuxql.mongodb.net/?appName=MITDB
```

### Check Data Count
```python
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
url = os.getenv('LIVE_MONGODB_URL')
client = MongoClient(url)
db = client['dbfull']

for collection_name in db.list_collection_names():
    count = db[collection_name].count_documents({})
    print(f"{collection_name}: {count} documents")
```

## Security Notes
- Keep your `.env` file secure and do not commit it to version control
- Add `.env` to `.gitignore` if not already present
- Rotate database credentials periodically
- Use environment variables in production deployment
