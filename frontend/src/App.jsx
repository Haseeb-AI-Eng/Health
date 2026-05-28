import React, { useState, useEffect } from 'react';
import DoctorLogin from './DoctorLogin';
import DoctorSignup from './DoctorSignup';
import PatientVerificationForm from './PatientVerificationForm';
import IntelliHealthInterface from './IntelliHealthInterface';

function App() {
 const [currentScreen, setCurrentScreen] = useState('login');
 const [patientData, setPatientData] = useState(null);

 // Check for existing session on mount
 useEffect(() => {
 // Check if user wants to navigate to signup
 const navigateTo = localStorage.getItem('navigateTo');
 if (navigateTo === 'signup') {
 localStorage.removeItem('navigateTo');
 setCurrentScreen('signup');
 return;
 }

 const token = localStorage.getItem('authToken');
 const role = localStorage.getItem('userRole');
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
 localStorage.setItem('authToken', token);
 localStorage.setItem('doctorName', doctor.name);
 localStorage.setItem('doctorEmail', doctor.email);
 localStorage.setItem('userRole', 'doctor');
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
 localStorage.removeItem('authToken');
 localStorage.removeItem('userRole');
 localStorage.removeItem('doctorName');
 localStorage.removeItem('doctorEmail');
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
 <div className="App">
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
 );
}

export default App;
