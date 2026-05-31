import React, { useState, useEffect } from 'react';
import DoctorLogin from './DoctorLogin';
import DoctorSignup from './DoctorSignup';
import PatientVerificationForm from './PatientVerificationForm';
import IntelliHealthInterface from './IntelliHealthInterface';

function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [patientData, setPatientData] = useState(null);

  // Update the browser tab title for each screen
  useEffect(() => {
    let title = 'DiabAssist';
    switch (currentScreen) {
      case 'login':
        title = 'Welcome to DiabAssist! Your AI Clinical Assistance Tool';
        break;
      case 'signup':
        title = 'Create Your DiabAssist Doctor Account';
        break;
      case 'verification':
        title = 'DiabAssist Patient Verification | AI Clinical Assistance Tool';
        break;
      case 'consultation':
        title = 'DiabAssist Clinical Consultation | AI Clinical Assistance Tool';
        break;
      default:
        title = 'DiabAssist';
    }
    document.title = title;
  }, [currentScreen]);

  useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    const role = sessionStorage.getItem('userRole');
    const savedPatient = localStorage.getItem('currentPatient');

    if (token && role === 'doctor') {
      if (savedPatient) {
        setPatientData(JSON.parse(savedPatient));
        setCurrentScreen('consultation');
      } else {
        setCurrentScreen('verification');
      }
    }
  }, []);

  const handleLoginSuccess = (token, doctor) => {
    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('doctorName', doctor.name);
    sessionStorage.setItem('doctorEmail', doctor.email);
    sessionStorage.setItem('userRole', 'doctor');
    setCurrentScreen('verification');
  };

  const handleSignupSuccess = (signupData) => {
    // If account is active, redirect to login
    if (signupData.account_status === 'active') {
      setCurrentScreen('login');
    } else {
      // Show message that account is pending verification
      setCurrentScreen('login');
    }
  };

  const handleBackToLogin = () => {
    setCurrentScreen('login');
  };

  const handleVerificationSuccess = (patient) => {
    setPatientData(patient);
    localStorage.setItem('currentPatient', JSON.stringify(patient));
    setCurrentScreen('consultation');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('doctorName');
    sessionStorage.removeItem('doctorEmail');
    localStorage.removeItem('currentPatient');
    setPatientData(null);
    setCurrentScreen('login');
  };

  const handleBackToVerification = () => {
    localStorage.removeItem('currentPatient');
    setPatientData(null);
    setCurrentScreen('verification');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Main Screen Content */}
      <div style={{ flex: 1 }}>
        {currentScreen === 'login' && (
          <DoctorLogin onLoginSuccess={handleLoginSuccess} />
        )}

        {currentScreen === 'signup' && (
          <DoctorSignup
            onSignupSuccess={handleSignupSuccess}
            onBackToLogin={handleBackToLogin}
          />
        )}

        {currentScreen === 'verification' && (
          <PatientVerificationForm
            onVerificationSuccess={handleVerificationSuccess}
            onCancel={handleLogout}
          />
        )}

        {currentScreen === 'consultation' && (
          <IntelliHealthInterface
            patientData={patientData}
            onBack={handleBackToVerification}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Global Footer — appears on every screen */}
      <footer style={{
        textAlign: 'center',
        padding: '12px 16px',
        fontSize: '13px',
        color: '#6b7280',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
      }}>
        <a href="#" style={{ color: '#6b7280', textDecoration: 'none', margin: '0 8px' }}>
          Privacy Statement
        </a>
        {' | '}
        <a href="#" style={{ color: '#6b7280', textDecoration: 'none', margin: '0 8px' }}>
          Terms and Conditions
        </a>
        {' | '}
        <a href="#" style={{ color: '#6b7280', textDecoration: 'none', margin: '0 8px' }}>
          Helpline
        </a>
      </footer>

    </div>
  );
}

export default App;