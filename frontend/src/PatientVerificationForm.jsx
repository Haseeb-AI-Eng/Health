import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 FiFileText,
 FiUser,
 FiCalendar,
 FiCheckCircle,
 FiAlertCircle,
 FiArrowRight,
 FiSearch,
 FiBook,
 FiLogOut,
 FiPlus,
 FiX,
 FiDroplet,
 FiHeart,
 FiActivity
} from 'react-icons/fi';
import axios from 'axios';
import { API_URL } from './apiConfig';
import AppHeader from './AppHeader';


const PatientVerificationForm = ({ onVerificationSuccess, onCancel }) => {
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [showPatientList, setShowPatientList] = useState(false);
 const [showAddPatientModal, setShowAddPatientModal] = useState(false);
 const [patients, setPatients] = useState([]);

 const [formData, setFormData] = useState({
 caseid: '',
 patid: '',
 pname: '',
 dob: '',
 age: ''
 });

 // Add patient form state
 const [addPatientData, setAddPatientData] = useState({
 pname: '',
 patient_email: '',
 dob: '',
 age: '',
 gender: '',
 disease: '',
 medication: '',
 presenting_complaint: '',
 bp: '',
 pulse: '',
 bmi: '',
 weight: '',
 height: '',
 family_history: '',
 social_history: '',
 allergies: '',
 case_notes: ''
 });

 const handleChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 setError('');
 };

 const handleAddPatientChange = (e) => {
 const { name, value } = e.target;
 setAddPatientData(prev => ({ ...prev, [name]: value }));
 };

 // Calculate BMI when weight or height changes
 useEffect(() => {
 const weight = parseFloat(addPatientData.weight);
 const height = parseFloat(addPatientData.height);
 
 if (weight > 0 && height > 0) {
 const heightInMeters = height / 100;
 const calculatedBmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
 setAddPatientData(prev => ({ ...prev, bmi: calculatedBmi }));
 }
 }, [addPatientData.weight, addPatientData.height]);

 const loadPatients = async () => {
 try {
 const token = sessionStorage.getItem('authToken');
 const response = await axios.get(`${API_URL}/api/doctor/patients`, {
 headers: {
 Authorization: `Bearer ${token}`
 }
 });
 setPatients(response.data);
 setShowPatientList(true);
 } catch (err) {
 console.error('Failed to load patients:', err);
 }
 };

 const selectPatient = (patient) => {
 setFormData({
 caseid: patient.caseid,
 patid: patient.patid,
 pname: patient.pname,
 dob: patient.dob,
 age: patient.age.toString(),
 patient_email: patient.patient_email || ''
 });
 setShowPatientList(false);
 };

 const handleAddPatient = async (e) => {
 e.preventDefault();
 setError('');
 setSuccess('');
 setIsLoading(true);

 try {
 const payload = {
 pname: addPatientData.pname,
 patient_email: addPatientData.patient_email || null,
 dob: addPatientData.dob,
 age: parseInt(addPatientData.age),
 gender: addPatientData.gender || null,
 disease: addPatientData.disease || null,
 medication: addPatientData.medication || null,
 presenting_complaint: addPatientData.presenting_complaint || null,
 bp: addPatientData.bp || null,
 pulse: addPatientData.pulse || null,
 bmi: addPatientData.bmi ? parseFloat(addPatientData.bmi) : null,
 weight: addPatientData.weight ? parseFloat(addPatientData.weight) : null,
 height: addPatientData.height ? parseFloat(addPatientData.height) : null,
 family_history: addPatientData.family_history || null,
 social_history: addPatientData.social_history || null,
 allergies: addPatientData.allergies || null,
 case_notes: addPatientData.case_notes || null
 };

 const token = sessionStorage.getItem('authToken');
 const response = await axios.post(`${API_URL}/api/doctor/patient/add`, payload, {
 headers: {
 Authorization: `Bearer ${token}`
 }
 });

 if (response.data.success) {
 setSuccess(`✅ Patient added successfully! Case ID: ${response.data.patient.caseid}, Patient ID: ${response.data.patient.patid}`);
 
 // Close modal and reset form
 setTimeout(() => {
 setShowAddPatientModal(false);
 setAddPatientData({
 pname: '',
 patient_email: '',
 dob: '',
 age: '',
 gender: '',
 disease: '',
 medication: '',
 presenting_complaint: '',
 bp: '',
 pulse: '',
 bmi: '',
 weight: '',
 height: '',
 family_history: '',
 social_history: '',
 allergies: '',
 case_notes: ''
 });
 setSuccess('');
 }, 2000);
 }
 } catch (err) {
 setError('❌ Failed to add patient. Please try again.');
 console.error('Add patient error:', err);
 } finally {
 setIsLoading(false);
 }
 };

 const handleVerify = async (e) => {
 e.preventDefault();
 setError('');
 setSuccess('');
 setIsLoading(true);

 try {
 const token = sessionStorage.getItem('authToken');
 const response = await axios.post(`${API_URL}/api/doctor/verify-patient`, {
 caseid: formData.caseid,
 patid: formData.patid,
 pname: formData.pname,
 dob: formData.dob,
 age: parseInt(formData.age)
 }, {
 headers: {
 Authorization: `Bearer ${token}`
 }
 });

 if (response.data.verified) {
 setSuccess('✅ Patient verified successfully!');
 setTimeout(() => {
 onVerificationSuccess(response.data.patient);
 }, 1000);
 }
 } catch (err) {
 if (err.response?.status === 404) {
 setError('❌ Patient not found. Please check the details and try again.');
 } else if (err.response?.status === 400) {
 const detail = err.response.data.detail;
 if (detail.mismatched_fields) {
 setError(`❌ Details don't match. Mismatched fields: ${detail.mismatched_fields.join(', ')}`);
 } else {
 setError('❌ Patient verification failed. Please check the details.');
 }
 } else {
 setError('❌ Verification failed. Please try again.');
 }
 console.error('Verification error:', err);
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="min-h-screen w-full bg-purple-400 flex flex-col items-center justify-start">
 <AppHeader />
 {/* Background decorations */}
 <div className="absolute inset-0 overflow-hidden">
 <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
 <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
 <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
 </div>

 {/* Main Container */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5 }}
 className="relative w-full max-w-4xl"
 >
 {/* Card */}
 <div className="bg-teal-100 rounded-2xl shadow-2xl overflow-hidden border-4 border-purple-400">
 {/* Header */}
 <div className="bg-purple-400 p-6 text-white">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <img src="/myimage.png" alt="DiabAssist Logo" className="w-16 h-16 object-cover shadow-lg" />
 <div>
 <h1 className="text-2xl font-bold">DiabAssist - Patient Verification</h1>
 <p className="text-teal-100 text-sm">Enter patient details to verify identity</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={onCancel}
 className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold"
 title="Logout and return to doctor login"
 >
 <FiLogOut size={16} />
 Back to Login
 </button>
 </div>
 </div>
 </div>

 {/* Form Container */}
 <div className="p-8">
 {/* Error Message */}
 <AnimatePresence>
 {error && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="mb-6 p-4 bg-red-100 border-2 border-red-400 rounded-xl flex items-start gap-3"
 >
 <FiAlertCircle className="text-red-600 text-lg flex-shrink-0 mt-0.5" />
 <p className="text-red-800 text-sm">{error}</p>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Success Message */}
 <AnimatePresence>
 {success && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="mb-6 p-4 bg-green-100 border-2 border-green-400 rounded-xl flex items-start gap-3"
 >
 <FiCheckCircle className="text-green-600 text-lg flex-shrink-0 mt-0.5" />
 <p className="text-green-800 text-sm">{success}</p>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Patient List and Add Patient Buttons */}
 <div className="mb-6 flex justify-end gap-3">
 <button
 onClick={() => setShowAddPatientModal(true)}
 className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors text-sm font-semibold border-2 border-green-700"
 >
 <FiPlus size={16} />
 Add New Patient
 </button>
 <button
 onClick={loadPatients}
 className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors text-sm font-semibold border-2 border-purple-700"
 >
 <FiBook size={16} />
 Browse Patient List
 </button>
 </div>

 {/* Patient List Modal */}
 <AnimatePresence>
 {showPatientList && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="mb-6 max-h-96 overflow-y-auto border-2 border-purple-400 rounded-xl bg-teal-50"
 >
 <div className="bg-purple-200 px-4 py-3 border-b-2 border-purple-400 flex justify-between items-center">
 <h3 className="font-bold text-purple-900">Select a Patient</h3>
 <button
 onClick={() => setShowPatientList(false)}
 className="text-purple-600 hover:text-purple-800"
 >
 <FiAlertCircle size={18} />
 </button>
 </div>
 <div className="divide-y divide-purple-200">
 {patients.map((patient) => (
 <button
 key={patient.patid}
 onClick={() => selectPatient(patient)}
 className="w-full px-4 py-3 hover:bg-teal-100 transition-colors text-left flex justify-between items-center"
 >
 <div>
 <p className="font-bold text-purple-900">{patient.pname}</p>
 <p className="text-sm text-purple-700">
 {patient.patid} • {patient.age} yrs • {patient.gender}
 </p>
 </div>
 <FiArrowRight className="text-purple-500" />
 </button>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Add New Patient Modal */}
 <AnimatePresence>
 {showAddPatientModal && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="mb-6 border-2 border-green-400 rounded-xl bg-green-50"
 >
 <div className="bg-green-200 px-4 py-3 border-b-2 border-green-400 flex justify-between items-center">
 <h3 className="font-bold text-green-900 flex items-center gap-2">
 <FiPlus />
 Add New Patient
 </h3>
 <button
 onClick={() => setShowAddPatientModal(false)}
 className="text-green-600 hover:text-green-800"
 >
 <FiX size={18} />
 </button>
 </div>
 
 <form onSubmit={handleAddPatient} className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
 {/* Basic Information Section */}
 <div className="bg-white rounded-lg p-4 border-2 border-green-300">
 <h4 className="font-bold text-green-900 mb-3 text-sm uppercase tracking-wide">Basic Information</h4>
 
 <div className="grid grid-cols-2 gap-3 mb-3">
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Patient Name *</label>
 <input
 type="text"
 name="pname"
 value={addPatientData.pname}
 onChange={handleAddPatientChange}
 placeholder="Full name"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 required
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">
 Patient Email *
 <span className="block text-[10px] font-normal text-green-600 mt-0.5">For diagnosis notifications</span>
 </label>
 <input
 type="email"
 name="patient_email"
 value={addPatientData.patient_email}
 onChange={handleAddPatientChange}
 placeholder="patient@example.com"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3 mb-3">
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Date of Birth *</label>
 <input
 type="date"
 name="dob"
 value={addPatientData.dob}
 onChange={handleAddPatientChange}
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 required
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Age *</label>
 <input
 type="number"
 name="age"
 value={addPatientData.age}
 onChange={handleAddPatientChange}
 placeholder="Years"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-3 mb-3">
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Gender</label>
 <select
 name="gender"
 value={addPatientData.gender}
 onChange={handleAddPatientChange}
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 >
 <option value="">Select</option>
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 </select>
 </div>
 </div>
 </div>

 {/* Clinical Information Section */}
 <div className="bg-white rounded-lg p-4 border-2 border-green-300">
 <h4 className="font-bold text-green-900 mb-3 text-sm uppercase tracking-wide">Clinical Information</h4>
 
 <div className="grid grid-cols-2 gap-3 mb-3">
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1 flex items-center gap-1">
 <FiActivity className="text-red-500" />
 Disease/Condition
 </label>
 <input
 type="text"
 name="disease"
 value={addPatientData.disease}
 onChange={handleAddPatientChange}
 placeholder="e.g., Diabetes Type 2"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Medication</label>
 <input
 type="text"
 name="medication"
 value={addPatientData.medication}
 onChange={handleAddPatientChange}
 placeholder="e.g., Metformin 500mg"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 />
 </div>
 </div>

 <div className="mb-3">
 <label className="block text-xs font-bold text-green-800 mb-1">Presenting Complaint</label>
 <textarea
 name="presenting_complaint"
 value={addPatientData.presenting_complaint}
 onChange={handleAddPatientChange}
 rows={2}
 placeholder="Main complaint or reason for visit"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
 />
 </div>
 </div>

 {/* Vitals Section */}
 <div className="bg-white rounded-lg p-4 border-2 border-green-300">
 <h4 className="font-bold text-green-900 mb-3 text-sm uppercase tracking-wide">Vital Signs</h4>
 
 <div className="grid grid-cols-3 gap-3 mb-3">
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1 flex items-center gap-1">
 <FiHeart className="text-red-500" />
 BP
 </label>
 <input
 type="text"
 name="bp"
 value={addPatientData.bp}
 onChange={handleAddPatientChange}
 placeholder="120/80"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Pulse</label>
 <input
 type="text"
 name="pulse"
 value={addPatientData.pulse}
 onChange={handleAddPatientChange}
 placeholder="72/min"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1 flex items-center gap-1">
 <FiDroplet className="text-purple-500" />
 BMI
 </label>
 <input
 type="number"
 name="bmi"
 value={addPatientData.bmi}
 onChange={handleAddPatientChange}
 step="0.1"
 placeholder="Auto"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-green-50"
 readOnly
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Weight (kg)</label>
 <input
 type="number"
 name="weight"
 value={addPatientData.weight}
 onChange={handleAddPatientChange}
 placeholder="kg"
 step="0.1"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Height (cm)</label>
 <input
 type="number"
 name="height"
 value={addPatientData.height}
 onChange={handleAddPatientChange}
 placeholder="cm"
 step="0.1"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
 />
 </div>
 </div>
 </div>

 {/* History Section */}
 <div className="bg-white rounded-lg p-4 border-2 border-green-300">
 <h4 className="font-bold text-green-900 mb-3 text-sm uppercase tracking-wide">Medical History</h4>
 
 <div className="space-y-3">
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Family History</label>
 <textarea
 name="family_history"
 value={addPatientData.family_history}
 onChange={handleAddPatientChange}
 rows={2}
 placeholder="Family medical history"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Social History</label>
 <textarea
 name="social_history"
 value={addPatientData.social_history}
 onChange={handleAddPatientChange}
 rows={2}
 placeholder="Smoking, alcohol, occupation, etc."
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-green-800 mb-1">Allergies</label>
 <textarea
 name="allergies"
 value={addPatientData.allergies}
 onChange={handleAddPatientChange}
 rows={2}
 placeholder="Known allergies"
 className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
 />
 </div>
 </div>
 </div>

 {/* Submit Button */}
 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => setShowAddPatientModal(false)}
 className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors font-semibold"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isLoading}
 className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 shadow-lg"
 >
 {isLoading ? (
 <>
 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
 Adding Patient...
 </>
 ) : (
 <>
 <FiCheckCircle />
 Add Patient
 </>
 )}
 </button>
 </div>
 </form>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Verification Form */}
 <motion.form
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 0.2 }}
 onSubmit={handleVerify}
 className="space-y-5"
 >
 {/* Case ID and Patient ID Row */}
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-teal-50 p-4 rounded-xl border-2 border-purple-400">
 <label className="block text-sm font-bold text-purple-900 mb-2">
 <FiFileText className="inline mr-2" />
 Case ID <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 name="caseid"
 value={formData.caseid}
 onChange={handleChange}
 placeholder="CASE-2024-00001"
 className="w-full px-4 py-3 border-2 border-purple-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all bg-white text-purple-900"
 required
 />
 </div>
 <div className="bg-teal-50 p-4 rounded-xl border-2 border-purple-400">
 <label className="block text-sm font-bold text-purple-900 mb-2">
 <FiUser className="inline mr-2" />
 Patient ID <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 name="patid"
 value={formData.patid}
 onChange={handleChange}
 placeholder="PAT-000001"
 className="w-full px-4 py-3 border-2 border-purple-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all bg-white text-purple-900"
 required
 />
 </div>
 </div>

 {/* Patient Name */}
 <div className="bg-teal-50 p-4 rounded-xl border-2 border-purple-400">
 <label className="block text-sm font-bold text-purple-900 mb-2">
 <FiUser className="inline mr-2" />
 Patient Name <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 name="pname"
 value={formData.pname}
 onChange={handleChange}
 placeholder="Full name as registered"
 className="w-full px-4 py-3 border-2 border-purple-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all bg-white text-purple-900"
 required
 />
 </div>

 {/* Date of Birth and Age Row */}
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-teal-50 p-4 rounded-xl border-2 border-purple-400">
 <label className="block text-sm font-bold text-purple-900 mb-2">
 <FiCalendar className="inline mr-2" />
 Date of Birth <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 name="dob"
 value={formData.dob}
 onChange={handleChange}
 className="w-full px-4 py-3 border-2 border-purple-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all bg-white text-purple-900"
 required
 />
 </div>
 <div className="bg-teal-50 p-4 rounded-xl border-2 border-purple-400">
 <label className="block text-sm font-bold text-purple-900 mb-2">
 <FiCalendar className="inline mr-2" />
 Age <span className="text-red-500">*</span>
 </label>
 <input
 type="number"
 name="age"
 value={formData.age}
 onChange={handleChange}
 placeholder="Years"
 className="w-full px-4 py-3 border-2 border-purple-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all bg-white text-purple-900"
 required
 />
 </div>
 </div>

 {/* Verify Button */}
 <button
 type="submit"
 disabled={isLoading}
 className="w-full mt-6 bg-purple-400 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg border-2 border-teal-700"
 >
 {isLoading ? (
 <>
 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
 Verifying Patient...
 </>
 ) : (
 <>
 <FiSearch />
 Verify Patient Details
 </>
 )}
 </button>
 </motion.form>

 {/* Info Box */}
 <div className="mt-6 p-4 bg-teal-50 border-2 border-purple-300 rounded-xl">
 <p className="text-sm text-purple-800">
 <strong>Note:</strong> All fields must match exactly as registered in the system.
 Use the patient list browser if you're unsure about the details.
 </p>
 </div>

 {/* Advertisement Section - Placeholder for future ads (Google Style) */}
 <div className="mt-6">
 {/* EI Logo Ad - Google Style Sponsored Content with Background */}
 <div className="bg-white rounded-lg p-3 border-2 border-purple-300">
 <a
 href="#"
 className="block group"
 onClick={(e) => {
 e.preventDefault();
 alert('EI Health Solutions - Advertisement click handler (to be implemented)');
 }}
 >
 <div className="flex items-center gap-3 py-1">
 <div className="flex items-center gap-2 flex-shrink-0">
 <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded font-medium">Ad</span>
 <div className="w-20 h-8 rounded overflow-hidden flex-shrink-0">
 <img
 src="/edited-photo.png"
 alt="EI Logo"
 className="w-full h-full object-cover"
 onError={(e) => {
 e.target.style.display = 'none';
 e.target.parentElement.innerHTML = '<img src="/edited-photo.png" class="w-full h-full object-cover" />';
 }}
 />
 </div>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-purple-600 group-hover:text-purple-800 truncate">EI Health Solutions</p>
 <p className="text-xs text-gray-600 truncate">Advanced Medical Technology for Modern Healthcare</p>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">Learn More</span>
 <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 </div>
 </div>
 </a>
 </div>
 </div>
 </div>
 </div>
 </motion.div>

 <style>{`
 @keyframes blob {
 0%, 100% { transform: translate(0, 0) scale(1); }
 33% { transform: translate(30px, -50px) scale(1.1); }
 66% { transform: translate(-20px, 20px) scale(0.9); }
 }
 .animate-blob {
 animation: blob 7s infinite;
 }
 .animation-delay-2000 { animation-delay: 2s; }
 .animation-delay-4000 { animation-delay: 4s; }
 `}</style>
 </div>
 );
};

export default PatientVerificationForm;
