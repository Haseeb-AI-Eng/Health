import requests
import json

url = "http://localhost:8000/check-prescription"
data = {
    "disease": "Headache",
    "medication": "Ibuprofen",
    "age": 30,
    "gender": "Male"
}

try:
    response = requests.post(url, json=data)
    print("Status Code:", response.status_code)
    print("Response:", json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
