from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["local"]

print("Example disease query:")
print(list(db.drug_disease_map.find({"disease":"migraine"}).limit(5)))

print("Example reaction query:")
print(list(db.drug_reaction_map.find({"drug_name":"sumatriptan"}).limit(5)))