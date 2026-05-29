import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiLock, FiAlertCircle, FiCheckCircle,
  FiEye, FiEyeOff, FiArrowRight
} from 'react-icons/fi';
import axios from 'axios';
import { API_URL } from './apiConfig';


const DEFAULT_NAME = 'DrAdmin';
const DEFAULT_PASSWORD = 'Doctor@1122';

const DoctorLogin = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [loginForm, setLoginForm] = useState({
    name: DEFAULT_NAME,
    password: DEFAULT_PASSWORD
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/doctor/login`, {
        name: loginForm.name.trim(),
        password: loginForm.password
      });

      localStorage.setItem('authToken', response.data.access_token);
      localStorage.setItem('userRole', 'doctor');
      localStorage.setItem('doctorName', response.data.doctor.name);
      localStorage.setItem('doctorEmail', response.data.doctor.email);

      setSuccess('✅ Login successful! Redirecting...');
      setTimeout(() => {
        onLoginSuccess(response.data.access_token, response.data.doctor);
      }, 1500);

    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 401) {
        setError(`❌ ${typeof detail === 'string' ? detail : 'Invalid credentials. Please check your name and password.'}`);
      } else if (err.response?.status === 403) {
        const msg = typeof detail === 'object' ? detail.message : detail;
        setError(`⚠️ ${msg || 'Account not active. Contact support.'}`);
      } else if (err.response?.status === 404) {
        setError('❌ Doctor account not found.');
      } else {
        setError('❌ Login failed. Please try again.');
      }
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDefaults = () => {
    setLoginForm({ name: DEFAULT_NAME, password: DEFAULT_PASSWORD });
    setError('');
  };

  return (
    <div className="min-h-screen bg-purple-400 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-teal-100 rounded-2xl shadow-2xl overflow-hidden border-4 border-purple-400">
          {/* Header */}
          <div className="bg-purple-400 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <img src="/myimage.png" alt="DiabAssist Logo" className="w-24 h-24 object-cover shadow-lg" />
            </div>
            <h1 className="text-3xl font-bold text-center">DiabAssist</h1>
            <p className="text-center text-teal-100 text-sm mt-2">Advanced Clinical Decision Support System</p>
            <p className="text-center text-teal-200 text-xs mt-1">Doctor Portal</p>
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

            {/* Login Form */}
            <motion.form
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleLogin}
              className="space-y-6"
            >
              {/* Doctor Name */}
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  <FiUser className="inline mr-2" />
                  Doctor Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={loginForm.name}
                  onChange={handleChange}
                  placeholder="e.g., DrAdmin"
                  className="w-full px-4 py-3 border-2 border-purple-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all bg-teal-50 text-purple-900"
                  required
                  autoComplete="off"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  <FiLock className="inline mr-2" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={loginForm.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border-2 border-purple-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all bg-teal-50 text-purple-900"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 bg-purple-400 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg border-2 border-teal-700"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Login to Portal
                    <FiArrowRight />
                  </>
                )}
              </button>

              {/* Demo Credentials */}
              <div className="mt-6 p-4 bg-teal-50 border-2 border-purple-300 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-purple-800">Default Credentials:</p>
                  <button
                    type="button"
                    onClick={fillDefaults}
                    className="text-xs text-purple-600 hover:text-purple-900 underline font-medium"
                  >
                    Auto-fill
                  </button>
                </div>
                <p className="text-xs text-purple-700">
                  Name:{' '}
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-purple-300">
                    {DEFAULT_NAME}
                  </span>
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Password:{' '}
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-purple-300">
                    {DEFAULT_PASSWORD}
                  </span>
                </p>
                <p className="text-xs text-purple-500 mt-2 italic">
                  Fields are pre-filled — just click Login.
                </p>
              </div>

              {/* Signup Link */}
              <div className="mt-4 text-center">
                <p className="text-sm text-purple-700">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('navigateTo', 'signup');
                      window.location.reload();
                    }}
                    className="text-purple-900 font-semibold hover:underline"
                  >
                    Register as Doctor
                  </button>
                </p>
              </div>
            </motion.form>

            <p className="text-center text-purple-700 text-xs mt-8">
              AI-Powered Clinical Decision Support System
            </p>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white text-sm mt-6 font-semibold"
        >
          Secure access for authorized medical professionals only
        </motion.p>

        {/* Ad Section */}
        <div className="mt-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-white/30 shadow-lg">
            <a href="#" className="block group" onClick={(e) => e.preventDefault()}>
              <div className="flex items-center gap-3 py-1">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] bg-white/50 text-purple-900 px-1.5 py-0.5 rounded font-medium">Ad</span>
                  <div className="w-20 h-8 rounded overflow-hidden flex-shrink-0">
                    <img src="/edited-photo.png" alt="EI Logo" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-purple-900 group-hover:text-purple-950 truncate">EI Health Solutions</p>
                  <p className="text-xs text-purple-800 truncate">Advanced Medical Technology for Modern Healthcare</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-purple-700 group-hover:text-purple-900 transition-colors">Learn More</span>
                  <svg className="w-4 h-4 text-purple-700 group-hover:text-purple-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>
          </div>
        </div>
      </motion.div>   

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default DoctorLogin;