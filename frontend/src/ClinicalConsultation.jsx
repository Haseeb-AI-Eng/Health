import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiActivity,
  FiPackage,
  FiMessageSquare,
  FiSend,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiUser,
  FiArrowLeft,
  FiDroplet,
  FiHeart,
  FiInfo
} from 'react-icons/fi';
import axios from 'axios';
import { API_URL } from './apiConfig';


const ClinicalConsultation = ({ patientData, onBack, onLogout }) => {
  const [editableData, setEditableData] = useState({ ...patientData });
  const [query, setQuery] = useState('');
  const [queryType, setQueryType] = useState('Generic');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationType, setConversationType] = useState('generic');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditableData(prev => ({ ...prev, [name]: value }));
  };

  const handleClinicalQuery = async () => {
    if (conversationType === 'clinical' && (!editableData.disease || !editableData.medication)) {
      alert('Please ensure disease and medication fields are filled for clinical queries');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        caseid: editableData.caseid,
        patid: editableData.patid,
        pname: editableData.pname,
        dob: editableData.dob,
        age: parseInt(editableData.age),
        gender: editableData.gender,
        disease: editableData.disease,
        medication: editableData.medication,
        query_type: queryType,
        custom_query: query,
        conversation_type: conversationType,
        presenting_complaint: editableData.presenting_complaint,
        bp: editableData.bp,
        pulse: editableData.pulse,
        bmi: editableData.bmi,
        family_history: editableData.family_history,
        social_history: editableData.social_history,
        allergies: editableData.allergies,
        patient_email: editableData.patient_email || null,
        doctor_name: editableData.doctor_name || localStorage.getItem('doctorName') || 'Your Healthcare Provider'
      };

      const token = localStorage.getItem('authToken');
      // ✅ FIXED: endpoint changed from /clinical-query to /clinical-analysis
      const response = await axios.post(`${API_URL}/clinical-analysis`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setAnalysisResult(response.data);
      setShowAnalysis(true);

      // ✅ FIXED: new backend returns response.data.content (not ai_response.response)
      if (response.data.content) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.content
        }]);
      }

    } catch (error) {
      console.error('❌ Error caught in try-catch:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      alert('Failed to analyze. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuery = async (quickQuery) => {
    setQuery(quickQuery);
    setIsLoading(true);

    try {
      const payload = {
        caseid: editableData.caseid,
        patid: editableData.patid,
        pname: editableData.pname,
        dob: editableData.dob,
        age: parseInt(editableData.age),
        gender: editableData.gender,
        disease: editableData.disease,
        medication: editableData.medication,
        query_type: queryType,
        custom_query: quickQuery,
        conversation_type: conversationType,
        presenting_complaint: editableData.presenting_complaint,
        bp: editableData.bp,
        pulse: editableData.pulse,
        bmi: editableData.bmi,
        family_history: editableData.family_history,
        social_history: editableData.social_history,
        allergies: editableData.allergies,
        patient_email: editableData.patient_email || null,
        doctor_name: editableData.doctor_name || localStorage.getItem('doctorName') || 'Your Healthcare Provider'
      };

      const quickToken = localStorage.getItem('authToken');
      // ✅ FIXED: endpoint changed from /clinical-query to /clinical-analysis
      const response = await axios.post(`${API_URL}/clinical-analysis`, payload, {
        headers: {
          Authorization: `Bearer ${quickToken}`
        }
      });

      // ✅ FIXED: new backend returns response.data.content (not ai_response.response)
      if (response.data.content) {
        setMessages(prev => [...prev,
          { role: 'user', content: quickQuery },
          { role: 'assistant', content: response.data.content }
        ]);
      }
    } catch (error) {
      console.error('Quick query error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDecisionConfig = (decision) => {
    switch (decision) {
      case 'SAFE':
        return {
          icon: FiCheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          bgGradient: 'bg-green-500'
        };
      case 'CAUTION':
        return {
          icon: FiAlertTriangle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          bgGradient: 'bg-amber-500'
        };
      case 'UNSAFE':
        return {
          icon: FiXCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          bgGradient: 'bg-red-500'
        };
      default:
        return {
          icon: FiInfo,
          color: 'text-purple-600',
          bgColor: 'bg-teal-50',
          borderColor: 'border-purple-200',
          bgGradient: 'bg-purple-400'
        };
    }
  };

  return (
    <div className="min-h-screen bg-purple-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-400 flex items-center justify-center text-white font-semibold">
              {editableData.pname.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{editableData.pname}</h1>
              <p className="text-xs text-gray-500">{editableData.patid} • {editableData.age} yrs • {editableData.gender}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Patient Details */}
          <div className="lg:col-span-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <div className="bg-purple-400 px-5 py-4 text-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FiUser />
                  Patient Details
                </h2>
                <p className="text-xs text-teal-100 mt-1">Editable information</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Case Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Case ID</label>
                    <input
                      type="text"
                      name="caseid"
                      value={editableData.caseid}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Patient ID</label>
                    <input
                      type="text"
                      name="patid"
                      value={editableData.patid}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Basic Info */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Name</label>
                  <input
                    type="text"
                    name="pname"
                    value={editableData.pname}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">DOB</label>
                    <input
                      type="date"
                      name="dob"
                      value={editableData.dob}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Age</label>
                    <input
                      type="number"
                      name="age"
                      value={editableData.age}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Gender</label>
                  <select
                    name="gender"
                    value={editableData.gender || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Clinical Info */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                      <FiActivity className="text-red-500" />
                      Disease/Condition
                    </label>
                    <input
                      type="text"
                      name="disease"
                      value={editableData.disease || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Type 2 Diabetes"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                      <FiPackage className="text-purple-500" />
                      Medication
                    </label>
                    <input
                      type="text"
                      name="medication"
                      value={editableData.medication || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Metformin 1000mg"
                    />
                  </div>
                </div>

                {/* Vitals */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3">Vital Signs</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                        <FiHeart className="text-red-500" />
                        BP
                      </label>
                      <input
                        type="text"
                        name="bp"
                        value={editableData.bp || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="120/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Pulse
                      </label>
                      <input
                        type="text"
                        name="pulse"
                        value={editableData.pulse || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="72/min"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                      <FiDroplet className="text-purple-500" />
                      BMI
                    </label>
                    <input
                      type="number"
                      name="bmi"
                      value={editableData.bmi || ''}
                      onChange={handleChange}
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="25.5"
                    />
                  </div>
                </div>

                {/* History */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Presenting Complaint</label>
                    <textarea
                      name="presenting_complaint"
                      value={editableData.presenting_complaint || ''}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Family History</label>
                    <textarea
                      name="family_history"
                      value={editableData.family_history || ''}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Social History</label>
                    <textarea
                      name="social_history"
                      value={editableData.social_history || ''}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Allergies</label>
                    <textarea
                      name="allergies"
                      value={editableData.allergies || ''}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - AI Analysis & Chat */}
          <div className="lg:col-span-2 space-y-4">

            {/* ✅ AI Response Card — shows content from new backend */}
            <AnimatePresence>
              {showAnalysis && analysisResult && analysisResult.content && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
                >
                  <div className="bg-purple-400 px-6 py-4 text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <FiCheckCircle className="text-xl" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">AI Clinical Analysis</h2>
                      <p className="text-xs text-purple-100">
                        {analysisResult.mode || 'Standard Mode'} •{' '}
                        {analysisResult.query_type || queryType}
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {analysisResult.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-4">
                      {analysisResult.timestamp
                        ? new Date(analysisResult.timestamp).toLocaleString()
                        : ''}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Query Interface */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <div className="bg-purple-400 px-6 py-5 text-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FiMessageSquare />
                  AI Clinical Assistant
                </h2>
                <p className="text-xs text-purple-100 mt-1">Ask questions about this patient's case</p>
              </div>

              {/* Conversation Type Selector */}
              <div className="p-5 border-b border-gray-200 bg-gray-50">
                <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">Conversation Mode</label>
                <select
                  value={conversationType}
                  onChange={(e) => setConversationType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="generic">📝 General Conversation (Any Topic)</option>
                  <option value="clinical">💊 Clinical Consultation (Medications & Disease)</option>
                  <option value="lifestyle">🏃 Lifestyle & Wellness</option>
                  <option value="preventive">🛡️ Preventive Health</option>
                  <option value="lab-results">🧪 Lab Results & Diagnostics</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Select the type of conversation or consultation you need</p>
              </div>

              {/* Query Type Selector */}
              <div className="p-5 border-b border-gray-200 bg-gray-50">
                <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">Analysis Type</label>
                <select
                  value={queryType}
                  onChange={(e) => setQueryType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="Generic">📋 Generic Query</option>
                  <option value="Explain">📖 Explain Condition</option>
                  <option value="Diagnosis">🔍 Diagnosis Analysis</option>
                  <option value="Treatment">💊 Treatment Plan</option>
                  <option value="Side Effects">⚠️ Side Effects & Monitoring</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Select the type of analysis or query</p>
              </div>

              {/* Quick Query Buttons */}
              <div className="p-5 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Quick Queries</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleQuickQuery("Explain the mechanism of action for this medication")}
                    className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                  >
                    💊 Drug Mechanism
                  </button>
                  <button
                    onClick={() => handleQuickQuery("What are the common side effects and monitoring requirements?")}
                    className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                  >
                    ⚠️ Side Effects
                  </button>
                  <button
                    onClick={() => handleQuickQuery("Are there any drug interactions to be aware of?")}
                    className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                  >
                    🔄 Interactions
                  </button>
                  <button
                    onClick={() => handleQuickQuery("What lifestyle modifications should be recommended?")}
                    className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                  >
                    🏃 Lifestyle Advice
                  </button>
                  <button
                    onClick={() => handleQuickQuery("What are the treatment goals and follow-up plan?")}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    📋 Follow-up Plan
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-5 h-80 overflow-y-auto bg-gray-50">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    <div className="text-center">
                      <FiMessageSquare className="text-4xl mx-auto mb-2 opacity-50" />
                      <p>Select a quick query or type your question below</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-800'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Query Input */}
              <div className="p-5 border-t border-gray-200">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleClinicalQuery()}
                    placeholder="Type your clinical query here..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    onClick={handleClinicalQuery}
                    disabled={isLoading}
                    className="px-6 py-3 bg-purple-400 text-white rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FiSend />
                    )}
                    Analyze
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Advertisement Section */}
            <div className="mt-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
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
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">Ad</span>
                      <div className="w-20 h-8 rounded overflow-hidden flex-shrink-0">
                        <img
                          src="/edited-photo.png"
                          alt="EI Logo"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
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
      </div>
    </div>
  );
};

export default ClinicalConsultation;