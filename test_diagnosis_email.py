"""
Test script for diagnosis email functionality.
Run this to verify email sending works.
"""
import asyncio
from email_service import send_diagnosis_email

async def test_diagnosis_email():
    """Test sending a diagnosis notification email"""
    
    # Test parameters - UPDATE THESE WITH REAL VALUES
    test_email = "test@example.com"  # Replace with actual test email
    patient_name = "John Doe"
    doctor_name = "Dr. Sarah Smith"
    diagnosis_summary = """
    **Diagnosis: Type 2 Diabetes Mellitus**
    
    • Blood sugar levels indicate poorly controlled diabetes
    • HbA1c: 8.2% (Target: <7.0%)
    • Fasting glucose: 145 mg/dL (Elevated)
    
    **Treatment Plan:**
    • Metformin 500mg twice daily with meals
    • Dietary modifications: Reduce carbohydrate intake
    • Exercise: 30 minutes walking daily
    • Monitor blood glucose twice weekly
    
    **Follow-up:** 2 weeks
    **Red Flags:** Contact doctor if blood sugar >250 mg/dL
    """
    
    print("=" * 60)
    print("TESTING DIAGNOSIS EMAIL FUNCTIONALITY")
    print("=" * 60)
    print(f"Sending email to: {test_email}")
    print(f"Patient: {patient_name}")
    print(f"Doctor: {doctor_name}")
    print("-" * 60)
    
    # Send the email
    success = await send_diagnosis_email(
        patient_email=test_email,
        patient_name=patient_name,
        doctor_name=doctor_name,
        diagnosis_summary=diagnosis_summary,
        clinic_name="DiabAssist Clinic"
    )
    
    print("-" * 60)
    if success:
        print("✅ Email sent successfully!")
    else:
        print("❌ Email sending failed!")
    print("=" * 60)
    
    return success

if __name__ == "__main__":
    print("\n⚠️  Before running this test:")
    print("1. Make sure your .env file has correct email credentials")
    print("2. Check that EMAIL_HOST_PASSWORD is set (not 'your-app-password-here')")
    print("3. For Gmail, you need an App Password, not your regular password")
    print("4. Update the test_email variable with a real email address\n")
    
    confirmation = input("Do you want to proceed with the test? (y/n): ")
    if confirmation.lower() == 'y':
        asyncio.run(test_diagnosis_email())
    else:
        print("Test cancelled.")
