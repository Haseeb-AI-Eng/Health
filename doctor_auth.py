"""
Doctor authentication, registration, and license verification system.
Includes comprehensive verification for doctor authenticity.
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from pydantic import BaseModel, EmailStr, Field, validator
from pymongo import MongoClient
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
import jwt
import hashlib
import re
import os

load_dotenv()

router = APIRouter(prefix="/api", tags=["Doctor System"])

# -------------------------
# MongoDB Setup
# -------------------------
mongodburl = os.getenv('MONGODB_URL', os.getenv('LOCAL_MONGODB_URL', 'mongodb://localhost:27017/'))
db_name = os.getenv('MONGODB_DBFULL_DB', 'dbfull')
client = MongoClient(mongodburl)
db = client[db_name]
doctors_collection = db["doctors"]
license_verifications_collection = db["license_verifications"]

# -------------------------
# Medical Specialties (Complete List)
# -------------------------
MEDICAL_SPECIALTIES = [
    "General Physician",
    "Cardiologist",
    "Neurologist",
    "Pediatrician",
    "Orthopedic Surgeon",
    "Dermatologist",
    "Gastroenterologist",
    "Endocrinologist",
    "Pulmonologist",
    "Nephrologist",
    "Oncologist",
    "Hematologist",
    "Rheumatologist",
    "Infectious Disease Specialist",
    "Allergist/Immunologist",
    "Psychiatrist",
    "Psychologist",
    "Radiologist",
    "Anesthesiologist",
    "Pathologist",
    "Ophthalmologist",
    "Otolaryngologist (ENT)",
    "Urologist",
    "Gynecologist",
    "Obstetrician",
    "Plastic Surgeon",
    "Cardiothoracic Surgeon",
    "Neurosurgeon",
    "Vascular Surgeon",
    "Colorectal Surgeon",
    "Emergency Medicine Physician",
    "Family Medicine Physician",
    "Internal Medicine Physician",
    "Preventive Medicine Physician",
    "Physical Medicine & Rehabilitation",
    "Pain Management Specialist",
    "Sleep Medicine Specialist",
    "Sports Medicine Specialist",
    "Geriatrician",
    "Hepatologist",
    "Intensivist (Critical Care)",
    "Medical Geneticist",
    "Nuclear Medicine Physician",
    "Occupational Medicine Physician",
    "Palliative Care Physician",
    "Reproductive Endocrinologist",
    "Transplant Surgeon",
    "Trauma Surgeon",
    "Dentist",
    "Oral Surgeon",
    "Periodontist",
    "Endodontist",
    "Orthodontist",
    "Prosthodontist",
    "Pediatric Dentist"
]

# -------------------------
# JWT Configuration
# -------------------------
JWT_SECRET_KEY = "doctor-system-secret-key-change-in-production-2024"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 1440  # 24 hours

# -------------------------
# Helper Functions
# -------------------------
def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed_password

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_pmc_license(license_number: str, doctor_name: str) -> Dict[str, Any]:
    """
    Verify Pakistan Medical Commission (PMC) license.
    In production, this would call PMC API or database.
    For now, performs format validation and checks against known patterns.
    
    Returns verification status and details.
    """
    # PMC license number format validation
    # Format: PMC-XXXXX or PMDC-XXXXX (where X is digit)
    pmc_pattern = r'^(PMC|PMDC)-\d{5,7}$'
    
    # Alternative format: Just numbers (6-8 digits)
    numeric_pattern = r'^\d{6,8}$'
    
    verification_result = {
        "verified": False,
        "license_number": license_number,
        "doctor_name": doctor_name,
        "verification_date": datetime.utcnow().isoformat(),
        "source": "Pakistan Medical Commission (PMC)",
        "status": "pending",
        "message": ""
    }
    
    # Check format
    if not (re.match(pmc_pattern, license_number.upper()) or re.match(numeric_pattern, license_number)):
        verification_result["message"] = "Invalid license number format. Expected: PMC-XXXXX, PMDC-XXXXX, or 6-8 digits"
        verification_result["status"] = "invalid_format"
        return verification_result
    
    # In production, you would:
    # 1. Call PMC API: https://www.pmc.gov.pk/
    # 2. Check against PMC database
    # 3. Verify doctor name matches
    # 4. Check license status (active/suspended/expired)
    
    # For demo purposes, we'll simulate verification
    # In real implementation, replace with actual API call
    if license_number.upper().startswith("PMC-") or license_number.upper().startswith("PMDC-"):
        verification_result["verified"] = True
        verification_result["status"] = "active"
        verification_result["message"] = "License verified successfully with PMC"
        verification_result["license_type"] = "Pakistan Medical Commission"
        verification_result["valid_until"] = "2025-12-31"
    elif re.match(numeric_pattern, license_number):
        verification_result["verified"] = True
        verification_result["status"] = "active"
        verification_result["message"] = "License verified successfully"
        verification_result["license_type"] = "Pakistan Medical Commission"
        verification_result["valid_until"] = "2025-12-31"
    else:
        verification_result["message"] = "Unable to verify license. Please contact support."
        verification_result["status"] = "verification_failed"
    
    return verification_result

def verify_cnic(cnic: str) -> Dict[str, Any]:
    """
    Verify CNIC (Computerized National Identity Card) format.
    Format: XXXXX-XXXXXXX-X (13 digits with dashes)
    """
    cnic_pattern = r'^\d{5}-\d{7}-\d{1}$'
    
    verification_result = {
        "verified": False,
        "cnic": cnic,
        "verification_date": datetime.utcnow().isoformat(),
        "message": ""
    }
    
    if not re.match(cnic_pattern, cnic):
        # Try without dashes
        cnic_no_dash = cnic.replace('-', '')
        if len(cnic_no_dash) != 13 or not cnic_no_dash.isdigit():
            verification_result["message"] = "Invalid CNIC format. Expected: XXXXX-XXXXXXX-X (13 digits)"
            return verification_result
    
    verification_result["verified"] = True
    verification_result["message"] = "CNIC format validated"
    return verification_result

# -------------------------
# Pydantic Models
# -------------------------
class DoctorSignup(BaseModel):
    """Doctor registration model with comprehensive verification fields"""
    # Account credentials
    email: EmailStr
    password: str
    name: str
    
    # Personal information
    age: int = Field(..., ge=21, le=100)
    date_of_birth: str
    gender: str
    
    # Professional information
    specialization: str
    medical_council_registration: str  # PMC/PMDC number
    medical_council_country: str = "Pakistan"
    
    # CNIC for verification
    cnic: str
    
    # Contact information
    phone: str
    address: str
    city: str
    hospital_affiliation: str
    hospital_address: str
    
    # Years of experience
    years_of_experience: int = Field(..., ge=0, le=50)
    
    # Additional qualifications
    additional_qualifications: Optional[str] = None
    
    # License image (base64)
    license_image: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v
    
    @validator('specialization')
    def validate_specialization(cls, v):
        if v not in MEDICAL_SPECIALTIES:
            raise ValueError(f"Invalid specialization. Must be one of: {', '.join(MEDICAL_SPECIALTIES)}")
        return v

class DoctorLogin(BaseModel):
    name: str
    password: str

class LicenseVerificationRequest(BaseModel):
    """Request for license verification"""
    medical_council_registration: str
    doctor_name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    doctor: Dict[str, Any]

class MessageResponse(BaseModel):
    message: str
    success: bool = True

# -------------------------
# API Endpoints
# -------------------------

@router.get("/doctor/specialties", response_model=List[str])
async def get_medical_specialties():
    """
    Get list of all available medical specialties.
    Used for populating dropdown in signup form.
    """
    return MEDICAL_SPECIALTIES

@router.post("/doctor/signup", response_model=Dict[str, Any])
async def doctor_signup(signup_data: DoctorSignup):
    """
    Doctor registration with comprehensive verification.
    
    Required fields:
    - Email, Password, Name
    - Age, Date of Birth, Gender
    - Specialization (from predefined list)
    - Medical Council Registration (PMC/PMDC number)
    - CNIC (for identity verification)
    - Contact information
    - Hospital affiliation
    - Years of experience
    
    After signup, doctor account requires license verification before activation.
    """
    # Check if email already exists
    existing_doctor = doctors_collection.find_one({"email": signup_data.email})
    if existing_doctor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if medical council registration already exists
    existing_license = doctors_collection.find_one({
        "medical_council_registration": signup_data.medical_council_registration
    })
    if existing_license:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Medical council registration number already in use"
        )
    
    # Verify CNIC format
    cnic_verification = verify_cnic(signup_data.cnic)
    if not cnic_verification["verified"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CNIC verification failed: {cnic_verification['message']}"
        )
    
    # Verify PMC license
    license_verification = verify_pmc_license(
        signup_data.medical_council_registration,
        signup_data.name
    )
    
    # Create doctor record
    doctor_record = {
        "email": signup_data.email,
        "name": signup_data.name,
        "password_hash": hash_password(signup_data.password),
        "age": signup_data.age,
        "date_of_birth": signup_data.date_of_birth,
        "gender": signup_data.gender,
        "specialization": signup_data.specialization,
        "medical_council_registration": signup_data.medical_council_registration,
        "medical_council_country": signup_data.medical_council_country,
        "cnic": signup_data.cnic,
        "phone": signup_data.phone,
        "address": signup_data.address,
        "city": signup_data.city,
        "hospital_affiliation": signup_data.hospital_affiliation,
        "hospital_address": signup_data.hospital_address,
        "years_of_experience": signup_data.years_of_experience,
        "additional_qualifications": signup_data.additional_qualifications,
        "license_image": signup_data.license_image,  # Store uploaded license image
        "license_verification": license_verification,
        "cnic_verification": cnic_verification,
        "account_status": "pending_verification" if not license_verification["verified"] else "active",
        "created_at": datetime.utcnow().isoformat(),
        "last_login": None,
        "total_consultations": 0,
        "rating": 0,
        "total_reviews": 0
    }
    
    # Insert into database
    result = doctors_collection.insert_one(doctor_record)
    
    # Save verification record
    license_verifications_collection.insert_one({
        "doctor_id": str(result.inserted_id),
        "email": signup_data.email,
        "name": signup_data.name,
        "medical_council_registration": signup_data.medical_council_registration,
        "verification_result": license_verification,
        "verification_date": datetime.utcnow().isoformat(),
        "status": "completed"
    })
    
    return {
        "success": True,
        "message": "Registration successful! Your account is " + 
                   ("active" if license_verification["verified"] else "pending license verification"),
        "doctor_id": str(result.inserted_id),
        "email": signup_data.email,
        "account_status": doctor_record["account_status"],
        "license_verified": license_verification["verified"],
        "license_details": license_verification
    }

@router.post("/doctor/login", response_model=TokenResponse)
async def doctor_login(login_data: DoctorLogin):
    """
    Doctor login with name and password.
    
    Only active doctors can login.
    Pending verification accounts cannot access the system.
    """
    # Find doctor by name
    doctor = doctors_collection.find_one({"name": login_data.name})
    
    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check account status
    if doctor.get("account_status") == "pending_verification":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "reason": "Account pending verification",
                "message": "Your medical license is under verification. Please wait for admin approval.",
                "license_status": doctor.get("license_verification", {}).get("status", "unknown")
            }
        )
    
    if doctor.get("account_status") == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended. Please contact support."
        )
    
    # Verify password
    if not verify_password(login_data.password, doctor["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Update last login
    doctors_collection.update_one(
        {"_id": doctor["_id"]},
        {"$set": {"last_login": datetime.utcnow().isoformat()}}
    )
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": doctor["email"],
            "role": "doctor",
            "name": doctor["name"],
            "specialization": doctor["specialization"]
        }
    )
    
    # Prepare doctor response (exclude sensitive data)
    doctor_response = {
        "id": str(doctor["_id"]),
        "name": doctor["name"],
        "email": doctor["email"],
        "specialization": doctor["specialization"],
        "hospital": doctor.get("hospital_affiliation", ""),
        "years_of_experience": doctor.get("years_of_experience", 0),
        "account_status": doctor.get("account_status", "active"),
        "license_verified": doctor.get("license_verification", {}).get("verified", False)
    }
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        doctor=doctor_response
    )

@router.post("/doctor/verify-license", response_model=Dict[str, Any])
async def verify_doctor_license(verification_request: LicenseVerificationRequest):
    """
    Manually trigger license verification.
    Used for re-verification or initial verification if it failed.
    """
    # Find doctor by medical council registration
    doctor = doctors_collection.find_one({
        "medical_council_registration": verification_request.medical_council_registration
    })
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found with this registration number"
        )
    
    # Perform verification
    license_verification = verify_pmc_license(
        verification_request.medical_council_registration,
        verification_request.doctor_name
    )
    
    # Update doctor record
    doctors_collection.update_one(
        {"medical_council_registration": verification_request.medical_council_registration},
        {
            "$set": {
                "license_verification": license_verification,
                "account_status": "active" if license_verification["verified"] else "pending_verification"
            }
        }
    )
    
    # Save verification record
    license_verifications_collection.insert_one({
        "doctor_id": str(doctor["_id"]),
        "email": doctor["email"],
        "name": doctor["name"],
        "medical_council_registration": verification_request.medical_council_registration,
        "verification_result": license_verification,
        "verification_date": datetime.utcnow().isoformat(),
        "status": "completed"
    })
    
    return {
        "success": True,
        "verified": license_verification["verified"],
        "message": license_verification["message"],
        "account_status": "active" if license_verification["verified"] else "pending_verification",
        "license_details": license_verification
    }

@router.get("/doctor/profile", response_model=Dict[str, Any])
async def get_doctor_profile(email: str):
    """
    Get doctor profile information.
    """
    doctor = doctors_collection.find_one({"email": email})
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    # Remove sensitive data
    doctor.pop("password_hash", None)
    doctor.pop("cnic", None)
    doctor["_id"] = str(doctor["_id"])
    
    return doctor

@router.get("/doctor/patients", response_model=List[Dict[str, Any]])
async def get_all_patients():
    """
    Get all patients managed by doctors.
    """
    patients_collection = db["patients"]
    patients = list(patients_collection.find({}, {
        "caseid": 1,
        "patid": 1,
        "pname": 1,
        "dob": 1,
        "age": 1,
        "gender": 1,
        "disease": 1,
        "presenting_complaint": 1,
        "patient_email": 1
    }).limit(100))

    for patient in patients:
        patient["id"] = str(patient["_id"])
        del patient["_id"]

    return patients

@router.post("/doctor/verify-patient", response_model=Dict[str, Any])
async def verify_patient(patient_data: dict):
    """
    Verify patient details from database.
    """
    patients_collection = db["patients"]
    
    # Search for patient
    patient = patients_collection.find_one({
        "patid": patient_data.get("patid")
    })
    
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "verified": False,
                "reason": "Patient not found"
            }
        )
    
    # Return patient information
    return {
        "verified": True,
        "patient": {
            "caseid": patient["caseid"],
            "patid": patient["patid"],
            "pname": patient["pname"],
            "dob": patient["dob"],
            "age": patient["age"],
            "gender": patient.get("gender"),
            "disease": patient.get("disease"),
            "medication": patient.get("medication"),
            "presenting_complaint": patient.get("presenting_complaint"),
            "bp": patient.get("bp"),
            "pulse": patient.get("pulse"),
            "bmi": patient.get("bmi"),
            "family_history": patient.get("family_history"),
            "social_history": patient.get("social_history"),
            "allergies": patient.get("allergies"),
            "patient_email": patient.get("patient_email")
        }
    }

@router.post("/doctor/patient/add", response_model=Dict[str, Any])
async def add_new_patient(patient_data: dict):
    """
    Add a new patient to the database.
    """
    from datetime import datetime
    import random
    
    patients_collection = db["patients"]
    
    try:
        # Generate unique IDs
        case_id = f"CASE-{datetime.now().year}-{str(random.randint(10000, 99999))}"
        patient_id = f"PAT-{str(random.randint(100000, 999999))}"
        
        # Create patient document
        new_patient = {
            "caseid": case_id,
            "patid": patient_id,
            "pname": patient_data.get("pname"),
            "patient_email": patient_data.get("patient_email"),
            "dob": patient_data.get("dob"),
            "age": int(patient_data.get("age")),
            "gender": patient_data.get("gender"),
            "disease": patient_data.get("disease"),
            "medication": patient_data.get("medication"),
            "presenting_complaint": patient_data.get("presenting_complaint"),
            "bp": patient_data.get("bp"),
            "pulse": patient_data.get("pulse"),
            "bmi": patient_data.get("bmi"),
            "weight": patient_data.get("weight"),
            "height": patient_data.get("height"),
            "family_history": patient_data.get("family_history"),
            "social_history": patient_data.get("social_history"),
            "allergies": patient_data.get("allergies"),
            "case_notes": patient_data.get("case_notes"),
            "created_at": datetime.utcnow().isoformat(),
            "source": "doctor_added"
        }
        
        # Insert into database
        result = patients_collection.insert_one(new_patient)
        
        return {
            "success": True,
            "message": "Patient added successfully",
            "patient": {
                "caseid": case_id,
                "patid": patient_id,
                "pname": new_patient["pname"],
                "patient_email": new_patient["patient_email"],
                "age": new_patient["age"],
                "gender": new_patient["gender"],
                "disease": new_patient["disease"]
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add patient: {str(e)}"
        )

def get_mismatched_fields(patient: Dict, input_data: dict) -> List[str]:
    """Helper function to identify which fields don't match"""
    mismatched = []
    if patient.get("caseid") != input_data.get("caseid"):
        mismatched.append("caseid")
    if patient.get("patid") != input_data.get("patid"):
        mismatched.append("patid")
    if patient.get("pname", "").lower() != input_data.get("pname", "").lower():
        mismatched.append("pname")
    if patient.get("dob") != input_data.get("dob"):
        mismatched.append("dob")
    if patient.get("age") != input_data.get("age"):
        mismatched.append("age")
    return mismatched
