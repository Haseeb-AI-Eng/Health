# 🏥 AI Medical Safety Platform - Advanced Features

A comprehensive medical prescription checking system with AI-powered drug interaction detection, symptom prediction, patient health timeline, risk scoring, and medical knowledge graph.

## 🌟 New Advanced Features (2026)

### 1️⃣ AI Drug Interaction Detector

**Detect dangerous interactions between multiple medications.**

#### Features:
- Check interactions between multiple medications simultaneously
- Severity levels: HIGH, MEDIUM, LOW
- Detailed interaction descriptions
- Real-time warnings

#### Example Input:
```
Medications: Ibuprofen, Warfarin, Aspirin
```

#### Example Output:
```
⚠️ Drug Interactions Detected:
🔴 Ibuprofen + Warfarin: May increase bleeding risk significantly
🟡 Ibuprofen + Aspirin: May reduce cardioprotective effect of aspirin
```

#### Implementation:
- `drug_interactions.csv` - Comprehensive interaction database
- `DrugInteractionAgent` - Agent that checks all medication combinations

---

### 2️⃣ AI Symptom → Disease Prediction

**Predict possible medical conditions from symptoms (like WebMD).**

#### Features:
- Enter multiple symptoms
- Get predicted diseases with confidence levels
- Matched symptoms shown for each prediction
- AI-powered fallback using Groq

#### Example Input:
```
Symptoms: headache, nausea, light sensitivity
```

#### Example Output:
```
🔍 Disease Prediction Results:

1. 🟢 Migraine (HIGH confidence)
   Matched symptoms: headache, nausea, light sensitivity

2. 🟡 Tension Headache (MEDIUM confidence)
   Matched symptoms: headache, nausea

3. 🟠 Cluster Headache (MEDIUM confidence)
   Matched symptoms: headache, light sensitivity
```

#### Implementation:
- `symptom_disease_map.csv` - Symptom to disease mapping
- `SymptomPredictionAgent` - Prediction engine

---

### 3️⃣ AI Patient Health Timeline

**Review patient's complete medical analysis history.**

#### Features:
- Store all analyses in MongoDB
- Timeline view with dates
- Filter by patient email
- Track decisions, risk levels, and drug interactions over time

#### Dashboard Shows:
```
Patient Health Timeline

March 12, 2026
Migraine – Sumatriptan – ✅ SAFE
Risk: LOW | Score: 35/100

March 5, 2026
Flu – Amoxicillin – ⚠️ CAUTION
Risk: MEDIUM | Score: 58/100
⚠️ 1 drug interaction detected
```

#### Implementation:
- MongoDB collection: `patient_reports`
- Endpoints: `/save-analysis`, `/patient-timeline/{user_email}`

---

### 4️⃣ AI Personal Medication Risk Score

**Quantified risk assessment (0-100 score).**

#### Factors Considered:
- **Age** (0-15 points): Extreme ages increase risk
- **Medication Count** (0-20 points): Polypharmacy risk
- **FAERS Data** (0-20 points): Adverse event reports
- **Adverse Reactions History** (0-20 points)
- **Symptom Severity** (0-15 points)
- **Gender-Specific Risks** (0-10 points): Pregnancy considerations

#### Example Output:
```
📊 Personal Risk Score: 72/100
Risk Level: MODERATE

Factors:
- Age Factor: Normal
- Medication Count: 3
- Adverse Reaction History: 2
- Symptom Severity: Moderate
```

#### Risk Categories:
- **MINIMAL**: 0-24
- **LOW**: 25-49
- **MODERATE**: 50-74
- **HIGH**: 75-100

#### Implementation:
- `PersonalRiskScoreAgent` - Comprehensive scoring algorithm

---

### 5️⃣ AI Medical Knowledge Graph

**Visualize relationships between diseases, symptoms, medications, and reactions.**

#### Features:
- Disease → Symptoms relationships
- Disease → Medications relationships
- Medication → Interactions relationships
- Medication → Side Effects relationships
- Interactive graph visualization

#### Example Graph Structure:
```
Migraine
   │
   ├─ Symptoms
   │     ├─ headache
   │     ├─ nausea
   │     ├─ light sensitivity
   │     └─ vomiting
   │
   └─ Medications
         ├─ sumatriptan
         ├─ rizatriptan
         └─ topiramate

Sumatriptan
   │
   ├─ Class: Triptan
   ├─ Uses: migraine, cluster headache
   ├─ Side Effects: tingling, warmth, flushing
   └─ Interactions: MAOIs, SSRIs, ergotamines
```

#### Implementation:
- `medical_knowledge_graph.json` - Structured knowledge base
- `KnowledgeGraphAgent` - Graph traversal and retrieval
- Endpoint: `/knowledge-graph`

---

### 6️⃣ Professional PDF Report Generation

**Download comprehensive medical reports as PDF.**

#### Features:
- Professional medical report format
- Patient information table
- Clinical summary
- Risk assessment with color coding
- AI clinical analysis
- Drug interactions table with severity colors
- Potential adverse reactions list
- Branded header and footer

#### Report Sections:
1. **Patient Information**
   - Name, Email, Age, Gender
   - Report Date

2. **Clinical Summary**
   - Diagnosis/Condition
   - Prescribed Medications

3. **Risk Assessment**
   - Overall Assessment (SAFE/CAUTION/UNSAFE)
   - Risk Level
   - Personal Risk Score

4. **AI Clinical Analysis**
   - Detailed explanation from AI

5. **Drug Interactions** (if any)
   - Color-coded severity table

6. **Potential Adverse Reactions**
   - List of known side effects

#### Implementation:
- `reportlab` library for PDF generation
- Endpoint: `/generate-pdf`
- Download button in chat interface

---

## 🎨 Enhanced Frontend Features

### UI Improvements:
- **Gradient Header**: Beautiful blue-purple-pink gradient
- **Glassmorphism Effects**: Modern translucent cards
- **Smooth Animations**: Framer Motion transitions
- **Custom Scrollbars**: Styled with gradient
- **Responsive Design**: Mobile-friendly

### New Components:
1. **Multiple Medication Input**
   - Add/remove medications dynamically
   - Comma-separated input support
   - Visual tags for each medication

2. **Symptom Checker**
   - Dedicated symptom input field
   - One-click prediction
   - Results displayed in chat

3. **Patient Timeline Modal**
   - Full-screen timeline view
   - Filter by patient name
   - Color-coded decisions

4. **Knowledge Graph Modal**
   - Browse diseases and medications
   - See relationships
   - ICD-10 codes included

5. **PDF Download Button**
   - Prominent download icon
   - Gradient styling
   - One-click report generation

---

## 📁 New Files Added

### Backend:
```
drug_interactions.csv       - Drug interaction database (100+ interactions)
symptom_disease_map.csv     - Symptom to disease mapping (100+ conditions)
medical_knowledge_graph.json - Structured medical knowledge base
requirements.txt            - Python dependencies
```

### Frontend:
```
src/App.jsx                 - Updated with all new features
src/PatientDetailsForm.js   - Multiple medications + symptom checker
src/ChatWindow.js           - PDF download support
src/Message.js              - Enhanced message rendering
src/App.css                 - Enhanced styling
```

---

## 🚀 API Endpoints

### Existing:
- `POST /check-prescription` - Analyze prescription
- `POST /upload-photo` - Image analysis
- `GET /` - Health check

### New:
- `POST /predict-disease` - Symptom to disease prediction
- `POST /save-analysis` - Save analysis to timeline
- `GET /patient-timeline/{user_email}` - Get patient history
- `POST /generate-pdf` - Generate PDF report
- `GET /knowledge-graph` - Get medical knowledge graph

---

## 📋 Usage Examples

### 1. Check Multiple Medications for Interactions:
```json
POST /check-prescription
{
  "disease": "Hypertension",
  "medication": "Ibuprofen, Warfarin, Lisinopril",
  "age": 65,
  "gender": "Male"
}
```

### 2. Predict Disease from Symptoms:
```json
POST /predict-disease
["headache", "nausea", "light sensitivity"]
```

### 3. Generate PDF Report:
```json
POST /generate-pdf
{
  "user_email": "patient@email.com",
  "patient_name": "John Doe",
  "age": 45,
  "gender": "Male",
  "disease": "Migraine",
  "medications": ["Sumatriptan", "Ibuprofen"],
  "final_decision": "SAFE",
  "risk_level": "LOW",
  "risk_score": {"score": 35, "level": "LOW"},
  "explanation": "...",
  "drug_interactions": [],
  "possible_reactions": ["dizziness", "drowsiness"]
}
```

---

## 🔧 Installation

### Backend:
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start MongoDB
mongod

# Start the server
python main.py
```

### Frontend:
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 📊 Database Collections

### New:
- `patient_reports` - Stores all patient analyses
  - Fields: user_email, date, disease, medication, final_decision, risk_level, risk_score, explanation, drug_interactions

### Existing:
- `faers_clean_reports` - FDA adverse event data
- `drug_disease_map` - Drug-disease relationships
- `drug_reaction_map` - Drug-reaction relationships

---

## 🎯 Risk Score Calculation

```python
Base Score: 50

Age Factor:
  < 12 or > 75: +15
  > 65: +10
  < 18: +5

Medication Count:
  > 5: +20 (polypharmacy)
  > 3: +10
  = 1: -10

FAERS Data (per medication):
  > 2000 reports: +10
  > 1000 reports: +5

Adverse Reactions History:
  Each reaction: +5 (max +20)

Symptom Severity:
  Severe: +15
  Moderate: +5
  Mild: +0

Gender-Specific:
  Pregnancy risk medications: +10

Final Score: min(max(score, 0), 100)
```

---

## 🛡️ Safety Features

1. **Conservative Assessments**: Always err on the side of caution
2. **Drug Interaction Warnings**: Highlight dangerous combinations
3. **Age-Based Adjustments**: Extra scrutiny for vulnerable populations
4. **Pregnancy Warnings**: Flag teratogenic medications
5. **FAERS Integration**: Real-world adverse event data
6. **Professional PDF**: Document everything for medical records

---

## 📈 Future Enhancements

- [ ] Integration with electronic health records (EHR)
- [ ] Real-time insurance formulary checking
- [ ] Genetic pharmacogenomics considerations
- [ ] Machine learning model for predictions
- [ ] Mobile app with barcode scanning
- [ ] Multi-language support
- [ ] Telemedicine integration

---

## ⚠️ Disclaimer

This system is for **informational and educational purposes only**. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified health providers with any questions regarding medical conditions or treatments.

---

## 📄 License

This project is for educational and research purposes.

---

## 👨‍💻 Developer Notes

The AI Medical Safety Platform represents a comprehensive approach to medication safety, combining:
- Multi-agent AI architecture
- Real-world adverse event data (FAERS)
- Drug interaction databases
- Medical knowledge graphs
- Professional reporting

Built with modern technologies:
- **Backend**: FastAPI, MongoDB, Groq AI
- **Frontend**: React, Tailwind CSS, Framer Motion
- **PDF**: ReportLab
- **AI**: Llama-4 via Groq

---

Made with ❤️ for safer medication management
