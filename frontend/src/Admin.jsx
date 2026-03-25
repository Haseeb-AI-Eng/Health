import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiChevronDown,
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiCalendar,
  FiActivity,
  FiFileText,
  FiSearch,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const Admin = ({ authToken }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 5;

  // Fetch all patients on component mount
  useEffect(() => {
    loadPatients(currentPage);
  }, [authToken, currentPage]);

  const loadPatients = async (page = 1) => {
    if (!authToken) {
      alert('You must be logged in as a doctor to access this page');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/patients`, {
        params: { page, per_page: perPage },
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      setPatients(response.data.patients || []);
      setTotalCount(response.data.total_count || 0);
      setTotalPages(response.data.total_pages || 0);
      setCurrentPage(response.data.page || 1);
      setSelectedPatient(null);
      setPatientDetails(null);
    } catch (error) {
      console.error('Error loading patients:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Only doctors can access the admin panel.');
      } else {
        alert('Failed to load patients. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setIsDropdownOpen(false);
    setIsLoading(true);

    try {
      const response = await axios.get(
        `${API_URL}/api/admin/patient/${encodeURIComponent(patient.user_email)}/details`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      setPatientDetails(response.data);
    } catch (error) {
      console.error('Error loading patient details:', error);
      alert('Failed to load patient details. Please try again.');
      setSelectedPatient(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePatient = async (patientName) => {
    if (!window.confirm(`Are you sure you want to delete all data for patient "${patientName}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.delete(
        `${API_URL}/api/admin/patient/${encodeURIComponent(patientName)}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      setSuccessMessage(`Patient "${patientName}" has been deleted successfully`);
      setSelectedPatient(null);
      setPatientDetails(null);
      setDeleteConfirm(null);
      setTimeout(() => setSuccessMessage(''), 3000);
      loadPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDaysSinceRegistration = (createdAt) => {
    if (!createdAt) return 'N/A';
    const created = new Date(createdAt);
    const now = new Date();
    const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Today' : `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50';
      case 'LOW':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getDecisionColor = (decision) => {
    switch (decision?.toUpperCase()) {
      case 'SAFE':
        return 'text-green-600 bg-green-50';
      case 'CAUTION':
        return 'text-yellow-600 bg-yellow-50';
      case 'UNSAFE':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <FiActivity className="text-white text-xl" />
                </div>
                Doctor Admin Panel
              </h1>
              <p className="text-gray-600 mt-1">Manage patient records and consultations</p>
            </div>
            <button
              onClick={loadPatients}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              <FiRefreshCw className={`${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Success Message */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3"
            >
              <FiCheckCircle className="text-green-600 text-xl" />
              <p className="text-green-800">{successMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Patient List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Patient List Header */}
              <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <h2 className="text-lg font-bold">Patients</h2>
                <p className="text-sm text-blue-100 mt-1">{totalCount} total patient{totalCount !== 1 ? 's' : ''}</p>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <FiSearch className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border-0 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Patient List */}
              <div className="overflow-y-auto max-h-96">
                {isLoading ? (
                  <div className="p-6 text-center text-gray-500">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
                    <p className="mt-2">Loading patients...</p>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <FiAlertCircle className="text-2xl mx-auto mb-2 text-gray-400" />
                    <p>No patients found</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          selectedPatient?.id === patient.id
                            ? 'bg-blue-100 border-l-4 border-blue-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {patient.user_email}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last visit: {new Date(patient.date).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <FiChevronLeft />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Next
                    <FiChevronRight />
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Panel - Patient Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            {selectedPatient && patientDetails ? (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Patient Info Header */}
                <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">{patientDetails.patient_info.patient_email}</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      ID: {patientDetails.patient_info.patient_id}
                    </p>
                    <p className="text-blue-100 text-sm mt-1">
                      Registered: {getDaysSinceRegistration(patientDetails.patient_info.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(selectedPatient.user_email)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-all"
                  >
                    <FiTrash2 />
                    Delete Patient
                  </button>
                </div>

                {/* Patient Stats */}
                <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-100">
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-gray-600 text-sm">Total Consultations</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">
                      {patientDetails.patient_info.total_consultations}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-gray-600 text-sm">Last Diagnosis</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1 truncate">
                      {patientDetails.patient_info.last_diagnosis || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-gray-600 text-sm">Last Risk Level</p>
                    <p className={`text-lg font-semibold mt-1 px-3 py-1 rounded-lg inline-block ${getRiskColor(patientDetails.patient_info.last_risk_level)}`}>
                      {patientDetails.patient_info.last_risk_level || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Consultations Table */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FiFileText className="text-blue-600" />
                    {patientDetails.patient_info.patient_email}'s Records
                  </h3>

                  {patientDetails.consultations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No consultations found for this patient</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Disease</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Medication</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Decision</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Risk Level</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientDetails.consultations.map((consultation, index) => (
                            <tr
                              key={consultation.id}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                            >
                              <td className="py-3 px-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <FiCalendar className="text-gray-400" />
                                  {new Date(consultation.date).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                {consultation.disease}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {consultation.medication}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDecisionColor(consultation.final_decision)}`}>
                                  {consultation.final_decision}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(consultation.risk_level)}`}>
                                  {consultation.risk_level}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                                {consultation.risk_score?.score ? consultation.risk_score.score.toFixed(0) : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <FiAlertCircle className="text-4xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">Select a Patient</h3>
                <p className="text-gray-500 mt-2">Choose a patient from the list to view their details</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <FiAlertCircle className="text-red-600 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Delete Patient</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete all records for <strong>{deleteConfirm}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePatient(deleteConfirm)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
