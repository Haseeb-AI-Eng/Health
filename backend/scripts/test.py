from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

mongodburl = os.getenv('MONGODB_URL', os.getenv('LOCAL_MONGODB_URL', 'mongodb://localhost:27017/'))
db_name = os.getenv('MONGODB_LOCAL_DB', 'local')
client = MongoClient(mongodburl)
db = client[db_name]

print("Example disease query:")
print(list(db.drug_disease_map.find({"disease":"migraine"}).limit(5)))

print("Example reaction query:")
print(list(db.drug_reaction_map.find({"drug_name":"sumatriptan"}).limit(5)))