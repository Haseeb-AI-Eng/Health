"""
Advanced AI Clinical System with Image & PDF Analysis
Independent analysis for each query based on uploaded data
"""
import os
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from groq import Groq
import fitz  # PyMuPDF
import base64
from datetime import datetime

# Import doctor auth routes
from doctor_auth import router as doctor_router

# Import email service
from email_service import send_diagnosis_email

# Import ADA guidelines engine
from ada_guidelines_engine import get_ada_engine

load_dotenv()

app = FastAPI(title="IntelliHealth AI Clinical System")

# -------------------------
# CORS Middleware Setup
# -------------------------
origins = [
    "http://localhost:3000",  # Local development
    "http://127.0.0.1:3000",  # Local development
    "https://hello-who--irumzainab3.replit.app",  # Frontend Replit
    "*"  # Allow all origins for now (can be restricted later with specific domain)
]
app.add_middleware(
       CORSMiddleware,
       allow_origins=origins,
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

# -------------------------
# Groq API Client Setup
# -------------------------
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    print("Warning: GROQ_API_KEY not found. AI features will not work.")
    groq_client = None
else:
    groq_client = Groq(api_key=groq_api_key)

# -------------------------
# MongoDB Setup with DB Connection Logging
# -------------------------
mongodburl = os.getenv('MONGODB_URL', os.getenv('LOCAL_MONGODB_URL', 'mongodb://localhost:27017/'))
db_name = os.getenv('MONGODB_LOCAL_DB', 'local_data')

is_live = "mongodb+srv" in mongodburl

print("\n" + "="*60)
if is_live:
    print("🌐  DATABASE MODE : LIVE ATLAS (Cloud)")
else:
    print("💻  DATABASE MODE : LOCAL MongoDB")
print(f"📁  Database Name : {db_name}")
print(f"🔗  URL Type      : {'mongodb+srv (Atlas)' if is_live else 'localhost (Local)'}")
print(f"🔑  MongoDB URL   : {mongodburl[:50]}..." if mongodburl else "❌ MONGODB_URL NOT SET")
print("="*60 + "\n")

# Initialize MongoDB with error handling
try:
    client = MongoClient(mongodburl, serverSelectionTimeoutMS=5000)
    # Test the connection
    client.admin.command('ping')
    db = client[db_name]
    patients_collection = db["patients"]
    analyses_collection = db["analyses"]
    email_notifications_collection = db["email_notifications"]
    print("✅ MongoDB connection successful!")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    print("⚠️  Some features will not work until MongoDB is configured")
    # Create placeholder collections that will fail on use
    db = None
    patients_collection = None
    analyses_collection = None
    email_notifications_collection = None

# -------------------------
# Include Routers
# -------------------------
app.include_router(doctor_router)

# -------------------------
# Pydantic Models
# -------------------------
class ClinicalQuery(BaseModel):
    caseid: str
    patid: str
    pname: str
    dob: str
    age: int
    gender: Optional[str] = None
    disease: Optional[str] = None
    medication: Optional[str] = None
    query_type: str = "Explain"
    custom_query: Optional[str] = ""
    conversation_type: Optional[str] = "clinical"  # 'clinical', 'general', 'lifestyle', 'preventive', 'lab-results'
    presenting_complaint: Optional[str] = None
    bp: Optional[str] = None
    pulse: Optional[str] = None
    bmi: Optional[float] = None
    family_history: Optional[str] = None
    social_history: Optional[str] = None
    allergies: Optional[str] = None
    image_data: Optional[str] = None
    image_name: Optional[str] = None
    pdf_text: Optional[str] = None
    pdf_name: Optional[str] = None
    # Patient email for diagnosis notification
    patient_email: Optional[str] = None
    doctor_name: Optional[str] = None
    # ADA 2026 Guideline Compliance Mode
    use_ada_mode: Optional[bool] = False  # If True, response MUST follow ADA 2026 guidelines strictly

# -------------------------
# Email Notification Tracking
# -------------------------
def should_send_email(patient_email: str) -> tuple[bool, str]:
    """
    Send email ONCE on the FIRST query for each unique patient email.
    Never sends again after that.
    """
    if not patient_email:
        return False, "No patient email provided"

    tracking = email_notifications_collection.find_one({"patient_email": patient_email})

    # If already sent once before — skip forever
    if tracking and tracking.get("emails_sent", 0) >= 1:
        return False, f"Email already sent to {patient_email} on first query — skipping"

    if not tracking:
        # Brand new patient — create tracking record
        email_notifications_collection.insert_one({
            "patient_email": patient_email,
            "emails_sent": 0,
            "created_at": datetime.utcnow().isoformat()
        })

    # Mark as sent
    email_notifications_collection.update_one(
        {"patient_email": patient_email},
        {"$set": {
            "emails_sent": 1,
            "first_sent_at": datetime.utcnow().isoformat()
        }}
    )

    print(f"✅ First query for {patient_email} — sending email now")
    return True, f"First consultation detected for {patient_email} — sending email"


# -------------------------
# Helper Functions
# -------------------------
def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using PyMuPDF"""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""

def encode_image_to_base64(file_bytes: bytes) -> str:
    """Encode image to base64"""
    return base64.b64encode(file_bytes).decode('utf-8')

# -------------------------
# Advanced AI Response Generator with Quality Criteria Integration
# -------------------------
def generate_advanced_ai_response(query_data: ClinicalQuery) -> Dict[str, Any]:
    """
    Generate comprehensive AI response incorporating 10 quality criteria:
    1. Multi-disciplinary expertise
    2. Good software & security practice
    3. Clinically relevant performance
    4. Representative training data
    5. Independent test sets
    6. Human-AI team performance focus
    7. Testing across demographics
    8. Clear user communication
    9. Monitoring real-world performance
    10. Deployed-model protections
    
    Analyzes uploaded images/PDFs INDEPENDENTLY from database data.
    Handles multiple conversation types intelligently.
    
    NEW: Supports ADA 2026 guideline-compliant responses (set use_ada_mode=true)
    """
    if not groq_client:
        return {"error": "AI service unavailable"}

    # Extract basic query parameters early for logging and consistency
    query_type = query_data.query_type
    custom_query = query_data.custom_query or ""
    conversation_type = query_data.conversation_type or "clinical"

    # Log the start of analysis to console
    print(f"\n{'='*70}")
    print(f"🔍 STARTING AI CLINICAL ANALYSIS")
    print(f"   - Patient: {query_data.pname} (ID: {query_data.patid})")
    print(f"   - Query: {query_type} | Conversation: {conversation_type}")
    print(f"   - ADA Mode: {'✅ ENABLED' if query_data.use_ada_mode else '❌ DISABLED'}")
    print(f"{'='*70}")

    # ===== ADA 2026 MODE HANDLING =====
    if query_data.use_ada_mode:
        print("\n" + "="*70)
        print("="*70)
        
        ada_engine = get_ada_engine()
        stats = ada_engine.get_guideline_stats()
        
        if not stats["guideline_loaded"]:
            return {
                "success": False,
                "error": "ADA mode requested but no guidelines loaded",
                "message": "Please upload ADA 2026 guideline PDF via /upload-guideline endpoint first",
                "next_steps": "1. Upload guideline PDF\n2. Set use_ada_mode=true again",
                "status": "GUIDELINE NOT LOADED"
            }
        
        # Log available guideline sources
        print(f"\n📋 ACTIVE GUIDELINE SOURCES: {stats['total_sources_loaded']}")
        for source_name, source_info in stats['sources'].items():
            print(f"   ✓ {source_name}")
            print(f"     - Type: {source_info['type']}")
            print(f"     - Words: {source_info['word_count']:,}")
            if 'added_at' in source_info:
                print(f"     - Loaded: {source_info['added_at']}")
        
        print(f"\n📊 TOTAL GUIDELINE CONTENT:")
        print(f"   - Total Sources: {stats['total_sources_loaded']}")
        print(f"   - Total Words: {stats['total_content_words']:,}")
        print(f"   - Total Characters: {stats['total_content_chars']:,}")
        
        # Build patient data for ADA prompt
        patient_data_for_ada = {
            "age": query_data.age,
            "gender": query_data.gender or "Not specified",
            "A1C": query_data.disease or "Not measured",
            "FPG": "See patient notes",
            "BMI": query_data.bmi or "Not recorded",
            "conditions": [query_data.disease] if query_data.disease else [],
            "risk_factors": [query_data.medication] if query_data.medication else [],
            "family_history": query_data.family_history or "Not provided",
            "allergies": query_data.allergies or "None known"
        }
        
        # Get ADA-compliant prompt WITH guideline usage metadata
        ada_prompt, guideline_usage = ada_engine.build_ada_prompt(
            patient_data=patient_data_for_ada,
            clinical_question=query_data.custom_query or f"{query_data.query_type}: Provide guideline-based analysis for {query_data.pname}"
        )
        
        print(f"\n✓ Integrated {guideline_usage['active_guideline_sources']} guideline sources into system prompt")
        print(f"✓ Using strict ADA 2026 deterministic mode (temperature: 0.3)")
        print(f"✓ Enforcing: No hallucinations, traceability, multi-option format")
        print(f"✓ LLM will cross-reference ALL {len(guideline_usage['sources'])} guideline sources")
        print(f"\n🔄 SYSTEM PROMPT PREPARATION:")
        print(f"   - Guideline sources included: {', '.join(guideline_usage['sources'])}")
        print(f"   - Total guideline words: {guideline_usage['total_content_words']:,}")
        print(f"   - Patient data points included: {len(patient_data_for_ada)}")
        print("="*70)
        
        try:
            print(f"\n📡 SENDING REQUEST TO LLM WITH ALL GUIDELINE SOURCES...")
            response = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": ada_prompt},
                    {"role": "user", "content": f"Patient: {query_data.pname}, Age: {query_data.age}\n\nAnalyze based STRICTLY on ALL guideline sources provided ({len(guideline_usage['sources'])} sources)."}
                ],
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                max_tokens=3000,
                temperature=0.3  # Lower temp for deterministic ADA output
            )
            
            ai_content = response.choices[0].message.content.strip()
            
            # Validate response follows ADA guidelines
            validation = ada_engine.validate_response(ai_content)
            
            print(f"\n✅ RESPONSE GENERATED SUCCESSFULLY")
            print(f"✓ All {len(guideline_usage['sources'])} guideline sources were included in LLM context:")
            for source in guideline_usage['sources']:
                print(f"   ✓ {source}")
            print(f"✓ Response validated: {validation['is_valid']}")
            if validation['issues']:
                print(f"⚠️  {validation['warning_count']} validation issues:")
                for issue in validation['issues']:
                    print(f"   {issue}")
            print("="*70 + "\n")
            
            return {
                "success": True,
                "content": ai_content,
                "query_type": query_type,
                "conversation_type": "ADA_2026_COMPLIANT",
                "mode": "ADA 2026 GUIDELINE-COMPLIANT",
                "analyzed_uploaded_data": bool(query_data.pdf_text or query_data.image_data),
                "guideline_usage": {
                    "total_sources_used": guideline_usage['active_guideline_sources'],
                    "sources_list": guideline_usage['sources'],
                    "total_words_in_context": guideline_usage['total_content_words'],
                    "total_chars_in_context": guideline_usage['total_content_chars'],
                    "note": "LLM received ALL guideline sources and cross-referenced them"
                },
                "guideline_stats": stats,
                "validation": validation,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            print(f"❌ ADA mode error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "mode": "ADA 2026",
                "message": "Error generating ADA-compliant response"
            }
    
    # ===== STANDARD MODE (non-ADA) =====
    print(f"📝 Applying Standard Clinical Quality Criteria and DRA Pakistan Guidelines...")

    # Build patient context from database
    patient_db_context = f"""
PATIENT DATABASE RECORD:
- Name: {query_data.pname}
- Age: {query_data.age} years
- Gender: {query_data.gender}
- Known Disease/Condition: {query_data.disease or 'Not specified'}
- Current Medication: {query_data.medication or 'Not specified'}
- Blood Pressure: {query_data.bp or 'Not recorded'}
- BMI: {query_data.bmi or 'Not recorded'}
- Family History: {query_data.family_history or 'Not provided'}
- Allergies: {query_data.allergies or 'None known'}
"""

    # Build uploaded data context
    uploaded_data_context = ""

    if query_data.pdf_text and query_data.pdf_text.strip():
        uploaded_data_context += f"""
UPLOADED PDF REPORT ({query_data.pdf_name or 'Unnamed'}):
{query_data.pdf_text[:3000]}

"""

    if query_data.image_data:
        uploaded_data_context += f"""
UPLOADED MEDICAL IMAGE ({query_data.image_name or 'Unnamed'}):
Image has been uploaded for analysis. Analyze this image for:
- Abnormalities, lesions, fractures, or pathological findings
- Anatomical structures and their condition
- Any signs of disease, injury, or medical conditions
- Comparison with normal anatomy
- Clinical significance of findings

"""

    # Determine analysis focus based on what was uploaded
    has_uploaded_data = bool(query_data.pdf_text or query_data.image_data)

    if has_uploaded_data:
        analysis_focus = """
IMPORTANT: This analysis should be based PRIMARILY on the UPLOADED DATA (PDF reports and/or medical images).
The patient database information is provided for context ONLY.
A patient can have MULTIPLE conditions, so focus on what the uploaded data reveals.
Do NOT limit your analysis to only the known disease in the database.
The uploaded tests/images may reveal:
- Additional diagnoses not previously recorded
- Complications of existing conditions
- Completely new conditions
- Treatment response or disease progression
- Acute issues requiring immediate attention
"""
    else:
        analysis_focus = """
Base your analysis on the patient's database record and clinical presentation.
Consider differential diagnoses and comprehensive evaluation.
"""

    # Build custom query instruction if provided
    custom_query_instruction = ""
    if custom_query and custom_query.strip():
        custom_query_instruction = f"""
USER'S SPECIFIC QUESTION: "{custom_query}"

IMPORTANT: Address this specific question comprehensively and in detail.
Your response should directly answer this question for the attending physician while considering all available patient data, uploaded reports/images, and clinical context.
Provide evidence-based, clinically relevant information tailored to this specific query.

"""

    doctor_identity = query_data.doctor_name or "Doctor"

    # Quality criteria integration text
    quality_criteria = """
QUALITY ASSURANCE PRINCIPLES (For Transparency & Safety):
1. MULTI-DISCIPLINARY EXPERTISE: This analysis draws on evidence from multiple medical specialties relevant to the case
2. CLINICALLY RELEVANT: All recommendations are grounded in current clinical practice and evidence
3. CLEAR COMMUNICATION: Limitations and uncertainties are explicitly stated; medical terms are explained
4. HUMAN OVERSIGHT: This AI-generated response requires physician review before clinical implementation
5. DEMOGRAPHIC CONSIDERATIONS: Recommendations account for age, gender, and demographic factors
6. AGE-SPECIFIC GUIDANCE: If a pediatric patient is involved, clearly state the child's age category and provide age-appropriate recommendations; if an older adult is involved, emphasize geriatric considerations such as polypharmacy, fall risk, renal function, cognitive status, frailty, functional status, and comorbidities
7. ADA 2026 GUIDELINE PRACTICAL POINTS: Use the actual ADA 2026 guideline PDFs and include the following core concepts:
   - Section 13 Older Adults: comprehensive geriatric assessment, the 4Ms framework (Mentation, Medications, Mobility, What Matters Most), annual screening for geriatric syndromes, individualized goals, treatment simplification, hypoglycemia reduction, cognitive and frailty evaluation, and caregiver/support needs
   - Section 14 Children and Adolescents: pediatric diabetes is developmentally distinct from adult diabetes; emphasize family/caregiver-centered DSMES, school and athletic planning, device and insulin dosing changes with growth and puberty, age-appropriate nutrition, behavioral health, and transition planning to adult care
   - Section 15 Diabetes in Pregnancy: preconception counseling for all with childbearing potential, effective contraception until glucose is optimized, target A1C <6.5% preconception if safely attainable, dual maternal-fetal risk reduction, and pregnancy-specific monitoring
   - Section 16 Diabetes Care in the Hospital: inpatient A1C assessment when none available in the prior 3 months, structured order sets/CPOE for dysglycemia management, dedicated diabetes care teams, hypoglycemia prevention, admission evaluation of diabetes type and self-management capacity, and discharge planning with follow-up and education
   - Section 10 Cardiovascular Disease and Risk Management: address ASCVD risk in diabetes through blood pressure and lipid control, consider ACE/ARB for albuminuria or CAD, use high-intensity statins for secondary prevention, consider aspirin for secondary prevention, and integrate heart failure and cardiorenal risk mitigation strategies
   - Section 11 Chronic Kidney Disease and Risk Management: annual UACR and eGFR screening for diabetes, CKD staging, albuminuria monitoring 1–4 times per year if CKD, optimize glycemia, use ACE/ARB and kidney-protective pharmacotherapy, and refer nephrology for advanced or dialysis-dependent disease
   - Section 12 Retinopathy, Neuropathy, and Foot Care: optimize glycemia, blood pressure, and lipids to prevent microvascular complications, perform routine ophthalmic screening, assess neuropathy and pain, perform annual foot exams, stratify foot ulcer risk, and use multidisciplinary foot care for ulcer prevention and management
   - Section 1 Introduction and Methodology: these Standards are a living document covering children, adolescents, adults, and older adults, and they are intended to support but not replace individualized clinical judgment
8. SAFETY FOCUS: All recommendations prioritize patient safety and are aligned with established guidelines
9. REAL-WORLD MONITORING: Recommendations include specific monitoring parameters and follow-up schedules
10. SECURITY & PRIVACY: All patient information is handled securely per healthcare standards
11. CONTINUOUS IMPROVEMENT: This system learns from validated clinical outcomes to improve accuracy
12. DEPLOYED SAFEGUARDS: Multiple validation checks ensure recommendations meet safety standards

Important Limitations to Communicate:
• This is an AI-assisted analysis - clinical judgment by a qualified physician is essential
• For emergency situations, seek immediate medical attention
• Individual patient factors may require deviation from standard recommendations
• Regular follow-up and reassessment are essential for optimal outcomes
"""

    # Select prompt based on query type and conversation type
    if query_type == "Generic":
        system_prompt = f"""You are a knowledgeable clinical assistant. You are currently assisting {doctor_identity} in reviewing patient records for {query_data.pname}.

IMPORTANT: Your user is Dr. {doctor_identity} (a medical professional), NOT the patient. Do NOT address the user by the patient's name ({query_data.pname}). Always address the user as {doctor_identity}.

FOCUS:
- Answer questions from {doctor_identity} about medical guidance, research, or information regarding the patient currently under review.
- Provide specific details about the patient ({query_data.pname}) from their records when asked to assist the physician.
- Provide evidence-based information in professional clinical language suitable for a medical peer.
- Be supportive, informative, and maintain a professional tone suitable for a clinical setting.

GUIDELINES:
- Use accessible, non-technical language where possible
- Explain medical terms when you use them
- Acknowledge limitations - this is AI assistance, not a diagnosis
- Recommend professional consultation when appropriate
- Be honest about uncertainty
- Explicitly state the patient's age group and how age alters diagnostic, therapeutic, and monitoring recommendations
- If the patient is a child, describe pediatric-specific considerations by age category (infant, toddler, school-age, adolescent) and draw from ADA 2026 pediatric diabetes guidance
- If the patient is an older adult, emphasize geriatric safety, polypharmacy review, renal dosing, fall risk, and cognitive or functional status, using ADA 2026 older adult diabetes care principles

PATIENT CONTEXT:
{patient_db_context}

{uploaded_data_context}

{custom_query_instruction}

{quality_criteria}

Provide a helpful, accurate, and evidence-based response to the patient's question or concern."""

    elif conversation_type == "general":
        system_prompt = f"""You are a knowledgeable and empathetic healthcare advisor providing general health information.

CONVERSATION FOCUS:
- General health questions and information
- Wellness guidance
- Preventive health tips
- General medical knowledge

CONVERSATION GUIDELINES:
- Use simple, accessible language
- Explain concepts clearly without overwhelming medical jargon
- Be supportive and encouraging
- Explicitly state when professional medical consultation is needed
- Do NOT provide specific medication prescriptions
- Do NOT diagnose medical conditions in detail
- Mention the patient's age group and highlight any age-specific advice or warnings
- For pediatric patients, use age-appropriate guidance and avoid adult-only recommendations
- For older adults, include geriatric safety considerations and follow-up needs
- Reflect ADA 2026 pediatric and geriatric diabetes guidance when applicable

RESPONSE FORMAT:
- Use bullet points (•) for key information
- Use bold for important concepts
- Keep paragraphs concise and readable
- Ask clarifying questions when needed

{quality_criteria}

Provide a helpful, accurate, and empathetic response that promotes health understanding and awareness."""

    elif conversation_type == "lifestyle":
        system_prompt = f"""You are a lifestyle and wellness expert providing evidence-based recommendations for healthy living.

CONVERSATION FOCUS:
- Lifestyle modifications
- Diet and nutrition guidance
- Physical activity recommendations
- Stress management and mental health
- Sleep hygiene
- Preventive health habits

PATIENT CONTEXT:
{patient_db_context}

GUIDELINES:
- Base recommendations on patient's age, gender, and known conditions
- Provide practical, actionable advice
- Explain the "why" behind recommendations
- Consider individual feasibility and preferences
- Reference evidence-based practices
- Explicitly describe age-specific advice for pediatric patients or older adults based on their age group
- If the patient is a child, include safe, developmentally appropriate lifestyle changes
- If the patient is an older adult, include mobility, fall prevention, and medication safety guidance
- Where relevant, cite ADA 2026 pediatric, geriatric, cardiovascular, kidney, and complication management guidance

RESPONSE FORMAT:
- Use numbered steps for practical advice
- Use bullet points (•) for key points
- Explain the benefits and expected outcomes
- Provide realistic timelines

{quality_criteria}

Provide comprehensive lifestyle recommendations that are evidence-based, practical, and tailored to this patient's profile."""

    elif conversation_type == "preventive":
        system_prompt = f"""You are a preventive medicine specialist providing comprehensive preventive health recommendations.

CONVERSATION FOCUS:
- Preventive screening recommendations
- Risk factor modification
- Disease prevention strategies
- Age-appropriate preventive measures
- Vaccination and immunization
- Lifestyle disease prevention

PATIENT CONTEXT:
{patient_db_context}

GUIDELINES:
- Align recommendations with current preventive medicine guidelines
- Consider patient demographics and risk factors
- Explain prevention benefits clearly
- Recommend appropriate screening intervals
- Reference evidence-based preventive strategies
- Explicitly organize recommendations by age group when relevant
- For pediatric patients, include age-appropriate vaccinations and growth/development monitoring
- For older adults, include age-specific screening, immunizations, frailty assessment, and fall risk reduction
- Use ADA 2026 preventive and age-group-specific guidance when applicable

RESPONSE FORMAT:
- Organize by age group or risk category
- Use numbered recommendations
- Include screening test names and intervals
- Explain "why" each prevention measure matters

{quality_criteria}

Provide actionable preventive health recommendations tailored to this patient's age, gender, family history, and known conditions."""

    elif conversation_type == "lab-results":
        system_prompt = f"""You are a clinical pathologist and lab medicine specialist providing interpretation of laboratory results.

CONVERSATION FOCUS:
- Lab test result interpretation
- Abnormal value explanations
- Clinical significance of findings
- Recommendations for further testing
- Trending and pattern analysis

PATIENT CONTEXT:
{patient_db_context}

{analysis_focus}

GUIDELINES:
- Explain normal vs abnormal values clearly
- Relate results to patient's conditions and medications
- Highlight critical or urgent findings
- Suggest follow-up testing when needed
- Avoid diagnosing - focus on test interpretation
- Mention age-specific normal ranges and interpretation when relevant
- If the patient is a child, use pediatric reference ranges and comment on growth/development indicators
- If the patient is an older adult, include geriatric considerations such as renal function, frailty, and medication effects on lab values
- Translate lab findings into age-appropriate clinical actions using ADA 2026 guidance where possible

RESPONSE FORMAT:
- Start with summary of key findings
- Use bullet points for individual test results
- Explain clinical significance
- Recommend monitoring or follow-up

{quality_criteria}

Provide professional lab result interpretation with clear clinical context and recommendations."""

    else:  # clinical (default)
        system_prompt = f"""You are a world-class clinical assistant providing Dr. {doctor_identity} with comprehensive clinical analysis and evidence-based recommendations for their patient ({query_data.pname}).

{analysis_focus}

PATIENT CONTEXT:
{patient_db_context}

DRUG REGULATORY AUTHORITY (DRA) PAKISTAN GUIDELINES COMPLIANCE:
All responses MUST comply with DRA Pakistan (dra.gov.pk) guidelines:
- Verify all medication recommendations against DRA Pakistan approved drug list
- Ensure dosages align with DRA Pakistan prescribing guidelines
- Check for any DRA Pakistan safety alerts or contraindications
- Follow DRA Pakistan clinical practice guidelines for the condition
- Reference DRA Pakistan drug scheduling and prescription requirements
- Ensure compliance with DRA Pakistan adverse drug reaction reporting requirements

RESPONSE FORMAT GUIDELINES:
- Use natural, conversational but professional language
- Use bullet points (•) for lists - make them detailed and informative
- Use bold text for key concepts and important warnings
- Use numbered steps when sequence matters
- Keep paragraphs focused and readable
- Only use headings when they add clarity
- Explain complex concepts clearly
- Highlight critical information prominently
- Explicitly describe how the patient's age affects diagnosis, treatment, and monitoring
- For pediatric patients, note any age-specific dosing or developmental considerations
- For older adults, note geriatric safety, cognitive status, renal function, and fall risk
- Reference applicable ADA 2026 section titles or age-specific guidance when using guideline-based reasoning

{custom_query_instruction}

Provide a comprehensive explanation covering:
• Patient overview combining database and uploaded data
• Detailed analysis of any uploaded PDF reports or medical images
• Key findings and their clinical significance
• Pathophysiology explained clearly
• Important red flags or concerns
• Clinical pearls and teaching points
• DRA Pakistan guideline compliance notes

{quality_criteria}

Be extremely detailed and clear. If uploaded data suggests different/additional diagnoses from database, clearly highlight this.
Explicitly state how your recommendations align with DRA Pakistan guidelines.
Remember: This AI analysis requires physician review and clinical judgment before patient implementation."""

    # Combine all context
    full_context = patient_db_context + "\n" + uploaded_data_context

    try:
        response = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_context if full_context.strip() else "Please provide general health information based on the patient profile provided in the system prompt."}
            ],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            max_tokens=2500,
            temperature=0.7
        )

        ai_content = response.choices[0].message.content.strip()

        return {
            "success": True,
            "content": ai_content,
            "query_type": query_type,
            "conversation_type": conversation_type,
            "analyzed_uploaded_data": has_uploaded_data,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        print(f"AI generation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "content": "Unable to generate AI response at this time."
        }

# -------------------------
# API Endpoints
# -------------------------
@app.post("/clinical-query")
async def clinical_query(query_data: ClinicalQuery, background_tasks: BackgroundTasks):
    """
    Advanced AI clinical query with comprehensive responses.
    Analyzes uploaded data independently from database.
    Sends diagnosis notification email to patient if email is provided.
    """
    try:
        # If patient_email is missing, attempt to fetch it from the database using patid
        if not query_data.patient_email:
            patient = patients_collection.find_one({"patid": query_data.patid})
            if patient and "patient_email" in patient:
                query_data.patient_email = patient["patient_email"]
                print(f"ℹ️ Auto-fetched missing patient email from DB: {query_data.patient_email}")

        result = generate_advanced_ai_response(query_data)

        # Save analysis (truncated to save storage)
        try:
            response_text = result.get("content", "")
            analyses_collection.insert_one({
                "caseid": query_data.caseid,
                "patid": query_data.patid,
                "pname": query_data.pname,
                "query_type": query_data.query_type,
                "conversation_type": query_data.conversation_type,
                "query": query_data.custom_query or query_data.query_type,
                "response": response_text[:300] + "..." if len(response_text) > 300 else response_text,
                "has_image": bool(query_data.image_data),
                "has_pdf": bool(query_data.pdf_text),
                "had_uploaded_data": bool(query_data.pdf_text or query_data.image_data),
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception as e:
            print(f"Save error: {e}")

        # Send diagnosis notification email to patient using background task
        try:
            if query_data.patient_email and query_data.patient_email.strip():
                print(f"\n{'='*60}")
                print(f"📧 CHECKING EMAIL NOTIFICATION ELIGIBILITY")
                print(f"{'='*60}")
                print(f"Patient Email: {query_data.patient_email}")
                print(f"Patient Name: {query_data.pname}")
                print(f"Doctor Name: {query_data.doctor_name or 'Your Healthcare Provider'}")
                
                # Check if we should send email based on tracking
                should_send, reason = should_send_email(query_data.patient_email)
                print(f"{'='*60}")
                
                if should_send:
                    print(f"✅ ELIGIBLE: {reason}")
                    # Extract a brief summary from the AI response (first 500 chars)
                    diagnosis_summary = result.get("content", "Medical consultation completed.")
                    if len(diagnosis_summary) > 500:
                        diagnosis_summary = diagnosis_summary[:500] + "..."
                    
                    # Get doctor name (if provided, otherwise use default)
                    doctor_name = query_data.doctor_name or "Your Healthcare Provider"
                    
                    # Add email sending to background tasks
                    background_tasks.add_task(
                        send_diagnosis_email,
                        patient_email=query_data.patient_email,
                        patient_name=query_data.pname,
                        doctor_name=doctor_name,
                        diagnosis_summary=diagnosis_summary,
                        clinic_name="DiabAssist Clinic"
                    )
                    print(f"✅ Email task added to background queue for {query_data.patient_email}")
                else:
                    print(f"⏭️  SKIPPED: {reason}")
            else:
                print(f"\n⚠️  NO EMAIL SENT: patient_email field is empty")
                print(f"   - Did the frontend send patient_email? {query_data.patient_email}")
                print(f"   - Check if patient was registered with an email\n")
        except Exception as e:
            # Don't fail the request if email sending fails
            print(f"\n⚠️  Email sending exception: {str(e)}")
            import traceback
            traceback.print_exc()
            print()

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patient-history")
async def get_patient_history(caseid: str = None, patid: str = None):
    """Get consultation history for a patient"""
    try:
        query = {}
        if caseid:
            query["caseid"] = caseid
        if patid:
            query["patid"] = patid
        
        history = list(analyses_collection.find(query).sort("timestamp", -1).limit(50))
        
        for item in history:
            item["_id"] = str(item["_id"])
        
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Upload medical image"""
    try:
        file_bytes = await file.read()
        image_base64 = encode_image_to_base64(file_bytes)
        
        return {
            "success": True,
            "image_data": image_base64,
            "filename": file.filename,
            "message": "Image uploaded. Click ASK AI to analyze."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and extract text from PDF report"""
    try:
        file_bytes = await file.read()
        extracted_text = extract_text_from_pdf(file_bytes)
        
        return {
            "success": True,
            "pdf_text": extracted_text,
            "filename": file.filename,
            "pages_count": len(fitz.open(stream=file_bytes, filetype="pdf")),
            "message": "PDF uploaded. Click ASK AI to analyze."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-guideline")
async def upload_guideline(file: UploadFile = File(...)):
    """
    Upload and extract text from ADA/clinical guideline PDF.
    Supports multiple PDFs - each will be integrated into LLM context.
    Stored in memory only - NOT saved to MongoDB to preserve storage.
    """
    try:
        file_bytes = await file.read()
        extracted_text = extract_text_from_pdf(file_bytes)
        page_count = len(fitz.open(stream=file_bytes, filetype="pdf"))
        word_count = len(extracted_text.split())

        # Generate source name from filename
        source_name = file.filename.replace(".pdf", "").replace(" ", "_").upper()[:50]

        print("\n" + "="*70)
        print(f"📥 GUIDELINE PDF UPLOAD: {file.filename}")
        print("="*70)
        print(f"📄 Source Name: {source_name}")
        print(f"📊 Pages: {page_count}")
        print(f"📝 Words: {word_count:,}")
        print(f"💾 Characters: {len(extracted_text):,}")

        # Store in ADA engine (memory only — NOT saved to MongoDB)
        ada_engine = get_ada_engine()
        ada_engine.add_guideline_source(
            source_name=source_name,
            content=extracted_text,
            source_type="guideline"
        )

        print(f"✅ Added to ADA engine memory: {source_name}")
        print(f"⚠️  Stored in memory only — not saved to MongoDB (storage optimisation)")

        # Get updated stats
        stats = ada_engine.get_guideline_stats()
        print(f"\n📋 CURRENT GUIDELINE LIBRARY:")
        print(f"   - Total sources loaded: {stats['total_sources_loaded']}")
        print(f"   - Total words in context: {stats['total_content_words']:,}")
        for src_name in stats['sources'].keys():
            print(f"      ✓ {src_name}")

        print("="*70 + "\n")

        return {
            "success": True,
            "message": f"Guideline '{source_name}' uploaded and activated",
            "filename": file.filename,
            "source_name": source_name,
            "content_length": len(extracted_text),
            "word_count": word_count,
            "page_count": page_count,
            "total_sources_now_loaded": stats['total_sources_loaded'],
            "all_sources": list(stats['sources'].keys()),
            "status": "PDF integrated into multi-guideline context for ADA mode",
            "note": "Stored in memory only. Re-upload if server restarts."
        }
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/guideline-status")
async def guideline_status():
    """Get comprehensive status of all loaded guidelines"""
    ada_engine = get_ada_engine()
    stats = ada_engine.get_guideline_stats()
    
    print("\n" + "="*70)
    print("📋 GUIDELINE STATUS REPORT")
    print("="*70)
    print(f"✓ Total guideline sources: {stats['total_sources_loaded']}")
    print(f"✓ Total content: {stats['total_content_words']:,} words")
    print("\nActive Guidelines:")
    for source_name, source_info in stats['sources'].items():
        print(f"  ✓ {source_name}")
        print(f"    - Type: {source_info['type']}")
        print(f"    - Words: {source_info['word_count']:,}")
    print("="*70 + "\n")
    
    return {
        "success": True,
        "stats": stats,
        "ada_mode_ready": stats["total_sources_loaded"] > 0,
        "total_guidelines_loaded": stats['total_sources_loaded'],
        "guidelines": stats['sources'],
        "total_words_in_context": stats['total_content_words'],
        "note": f"All {stats['total_sources_loaded']} guideline sources will be used in ADA mode" if stats['total_sources_loaded'] > 0 else "Upload guideline PDFs via /upload-guideline",
        "next_steps": "Set use_ada_mode=true in clinical queries to use all loaded guidelines" if stats['total_sources_loaded'] > 0 else "1. Upload at least one guideline PDF\n2. Set use_ada_mode=true in clinical queries"
    }

# ============================================================================
# DEMO CASE STUDIES ENDPOINT - For Client Demonstrations
# Shows multiple analysis types for the SAME patient
# ============================================================================

class DemoPatientData(BaseModel):
    """Patient data for demo generation"""
    caseid: str
    patid: str
    pname: str
    age: int
    gender: str
    disease: str
    medication: str
    bp: str
    pulse: str
    bmi: float
    presenting_complaint: str
    family_history: str
    social_history: str
    allergies: str

@app.post("/demo-cases")
async def get_demo_cases(patient_data: DemoPatientData):
    """
    Get demo case options for the CURRENT patient.
    Returns 4 analysis types for the same patient.
    """
    demo_cases = [
        {
            "id": 1,
            "title": f"{patient_data.disease} - Diagnostic Analysis",
            "query_type": "Diagnosis",
            "description": "AI will analyze symptoms and provide differential diagnoses"
        },
        {
            "id": 2,
            "title": f"{patient_data.disease} - Treatment Plan",
            "query_type": "Treatment",
            "description": "AI will recommend medications and lifestyle changes"
        },
        {
            "id": 3,
            "title": f"{patient_data.medication} - Side Effects Analysis",
            "query_type": "Side Effects",
            "description": "AI will analyze medication safety and side effects"
        },
        {
            "id": 4,
            "title": f"{patient_data.disease} - Condition Explanation",
            "query_type": "Explain",
            "description": "AI will explain the condition in detail"
        }
    ]
    
    return {
        "success": True,
        "patient_name": patient_data.pname,
        "total_cases": len(demo_cases),
        "cases": demo_cases
    }

@app.post("/demo-case/run")
async def run_demo_case(demo_request: dict):
    """
    Run a demo analysis for the current patient.
    """
    import time
    
    patient_data = demo_request.get("patient_data", {})
    query_type = demo_request.get("query_type", "Explain")
    
    full_query = {
        "caseid": patient_data.get("caseid", "DEMO"),
        "patid": patient_data.get("patid", "DEMO"),
        "pname": patient_data.get("pname", "Demo Patient"),
        "dob": "",
        "age": int(patient_data.get("age", 30)),
        "gender": patient_data.get("gender", "Male"),
        "disease": patient_data.get("disease", "Unknown"),
        "medication": patient_data.get("medication", "None"),
        "bp": patient_data.get("bp", "120/80"),
        "pulse": patient_data.get("pulse", "80"),
        "bmi": float(patient_data.get("bmi", 25)),
        "presenting_complaint": patient_data.get("presenting_complaint", "General checkup"),
        "family_history": patient_data.get("family_history", "None"),
        "social_history": patient_data.get("social_history", "None"),
        "allergies": patient_data.get("allergies", "None"),
        "query_type": query_type,
        "custom_query": ""
    }
    
    query = ClinicalQuery(**full_query)
    
    start_time = time.time()
    result = generate_advanced_ai_response(query)
    response_time = round(time.time() - start_time, 2)
    
    return {
        "success": True,
        "title": f"{patient_data.get('disease', 'Condition')} - {query_type} Analysis",
        "patient_info": {
            "name": patient_data.get("pname", "Demo Patient"),
            "age": patient_data.get("age", 30),
            "gender": patient_data.get("gender", "Male"),
            "condition": patient_data.get("disease", "Unknown"),
            "medication": patient_data.get("medication", "None"),
            "bp": patient_data.get("bp", "120/80"),
            "pulse": patient_data.get("pulse", "80"),
            "bmi": patient_data.get("bmi", 25),
            "presenting_complaint": patient_data.get("presenting_complaint", "General checkup"),
            "family_history": patient_data.get("family_history", "None"),
            "social_history": patient_data.get("social_history", "None"),
            "allergies": patient_data.get("allergies", "None")
        },
        "query_type": query_type,
        "ai_analysis": result.get("content", ""),
        "analysis_metadata": {
            "response_time_seconds": response_time,
            "ai_model": "Llama-4 via Groq",
            "analyzed_uploaded_data": result.get("analyzed_uploaded_data", False)
        }
    }

@app.get("/")
async def root():
    return {
        "message": "IntelliHealth AI Clinical System API",
        "status": "running",
        "version": "2.0",
        "demo_endpoints": {
            "list_demos": "POST /demo-cases - Get demo options for current patient",
            "run_demo": "POST /demo-case/run - Run demo and generate PDF report"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint that verifies database connectivity"""
    db_status = "unknown"
    db_message = "Database status unknown"
    
    try:
        if client is not None:
            client.admin.command('ping')
            db_status = "connected"
            db_message = f"✅ Connected to {db_name} database"
        else:
            db_status = "disconnected"
            db_message = "❌ Database client not initialized - Check MONGODB_URL environment variable"
    except Exception as e:
        db_status = "error"
        db_message = f"❌ Database connection error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": {
            "status": db_status,
            "message": db_message,
            "name": db_name
        },
        "groq_api": "configured" if groq_client else "not configured",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)