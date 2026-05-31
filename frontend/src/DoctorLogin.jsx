import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from './apiConfig';

const DEFAULT_NAME = 'DrAdmin';
const DEFAULT_PASSWORD = 'Doctor@1122';

const DoctorLogin = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

      setSuccess('✓ Login successful! Redirecting...');
      setTimeout(() => {
        onLoginSuccess(response.data.access_token, response.data.doctor);
      }, 1500);

    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 401) {
        setError(typeof detail === 'string' ? detail : 'Invalid credentials.');
      } else if (err.response?.status === 403) {
        const msg = typeof detail === 'object' ? detail.message : detail;
        setError(msg || 'Account not active.');
      } else if (err.response?.status === 404) {
        setError('Doctor account not found.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Myriad Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif" }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          height: 100%;
          width: 100%;
          overflow: hidden;
        }

        body {
          background-color: #ffffff;
          min-height: 100vh;
          font-family: 'Myriad Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        #root {
          height: 100vh;
          width: 100%;
          overflow: hidden;
        }

        .login-wrapper {
          height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 10px 40px;
        }

        .logo {
          font-size: 42px;
          color: #1a1a2e;
          font-weight: 700;
          font-family: 'Myriad Pro', sans-serif;
        }

        .logo-light {
          font-weight: 300;
          font-family: 'Myriad Pro', sans-serif;
        }

        .header-badge {
          text-align: right;
        }

        .badge-title {
          background-color: #00a19a;
          color: white;
          padding: 8px 16px;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: 1px;
          font-family: 'Myriad Pro', sans-serif;
        }

        .badge-subtitle {
          color: #1a1a2e;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-top: 8px;
          font-family: 'Myriad Pro', sans-serif;
        }

        .hero {
          position: relative;
          flex: 1;
          background-image: url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/987-Zuxm3zEuUneafXZ8dD3P53yxuU7Gir.jpeg');
          background-size: cover;
          background-position: center top;
          background-repeat: no-repeat;
          image-rendering: crisp-edges;
          filter: brightness(1.12) contrast(1.15) saturate(1.1);
        }

        .login-card {
          position: absolute;
          right: 46px;
          top: 200px;
          background: white;
          padding: 30px;
          width: 340px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          z-index: 10;
        }

        .login-title {
          color: #00a19a;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          font-family: 'Myriad Pro', sans-serif;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
          font-family: 'Myriad Pro', sans-serif;
        }

        .form-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          font-size: 14px;
          outline: none;
          border-radius: 4px;
          font-family: 'Myriad Pro', sans-serif;
        }

        .password-field .form-input {
          padding-right: 35px;
        }

        .form-input:focus {
          border-color: #00a19a;
          box-shadow: 0 0 0 2px rgba(0, 161, 154, 0.1);
        }

        .password-field {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #666;
          font-size: 18px;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: #00a19a;
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(to right, #8b5cf6, #d946ef);
          color: white;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 10px;
          border-radius: 4px;
          transition: opacity 0.2s;
          font-family: 'Myriad Pro', sans-serif;
        }

        .submit-btn:hover {
          opacity: 0.9;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .signup-link {
          display: block;
          text-align: right;
          margin-top: 15px;
          font-size: 12px;
          color: #666;
          font-family: 'Myriad Pro', sans-serif;
        }

        .signup-link a {
          color: #00a19a;
          text-decoration: none;
          cursor: pointer;
          font-family: 'Myriad Pro', sans-serif;
        }

        .signup-link a:hover {
          text-decoration: underline;
        }

        .dna-icon {
          position: absolute;
          right: 340px;
          top: 50%;
          transform: translateY(-50%);
          width: 60px;
          height: 120px;
        }

        .content {
          padding: 15px 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: white;
          flex-shrink: 0;
        }

        .welcome-text {
          font-size: 14px;
          color: #333;
          max-width: 500px;
          line-height: 1.4;
          font-family: 'Myriad Pro', sans-serif;
        }

        .footer {
          padding: 10px 40px;
          text-align: center;
          background: white;
          flex-shrink: 0;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 10px;
          font-size: 12px;
          color: #666;
          font-family: 'Myriad Pro', sans-serif;
        }

        .footer-links a {
          color: #666;
          text-decoration: none;
          font-family: 'Myriad Pro', sans-serif;
        }

        .footer-links a:hover {
          color: #00a19a;
        }

        .footer-links span {
          color: #ccc;
        }

        .error-message {
          color: #dc2626;
          font-size: 12px;
          padding: 8px;
          background-color: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          margin-bottom: 10px;
          font-family: 'Myriad Pro', sans-serif;
        }

        .success-message {
          color: #059669;
          font-size: 12px;
          padding: 8px;
          background-color: #d1fae5;
          border: 1px solid #a7f3d0;
          border-radius: 4px;
          margin-bottom: 10px;
          font-family: 'Myriad Pro', sans-serif;
        }
      `}</style>

      {/* Hero Section */}
      <div className="login-wrapper">
        <section className="hero">
        {/* DNA Icon SVG */}
        <svg className="dna-icon" viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M30 0 C45 20, 15 40, 30 60 C45 80, 15 100, 30 120" stroke="url(#gradient1)" strokeWidth="4" fill="none"/>
          <path d="M30 0 C15 20, 45 40, 30 60 C15 80, 45 100, 30 120" stroke="url(#gradient2)" strokeWidth="4" fill="none"/>
          <line x1="18" y1="15" x2="42" y2="15" stroke="#00a19a" strokeWidth="2"/>
          <line x1="15" y1="30" x2="45" y2="30" stroke="#00a19a" strokeWidth="2"/>
          <line x1="18" y1="45" x2="42" y2="45" stroke="#8b5cf6" strokeWidth="2"/>
          <line x1="15" y1="60" x2="45" y2="60" stroke="#8b5cf6" strokeWidth="2"/>
          <line x1="18" y1="75" x2="42" y2="75" stroke="#d946ef" strokeWidth="2"/>
          <line x1="15" y1="90" x2="45" y2="90" stroke="#d946ef" strokeWidth="2"/>
          <line x1="18" y1="105" x2="42" y2="105" stroke="#d946ef" strokeWidth="2"/>
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00a19a"/>
              <stop offset="100%" stopColor="#d946ef"/>
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00a19a"/>
              <stop offset="50%" stopColor="#8b5cf6"/>
              <stop offset="100%" stopColor="#d946ef"/>
            </linearGradient>
          </defs>
        </svg>

        {/* Login Card */}
        <div className="login-card">
          <h2 className="login-title">Login</h2>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="text"
                name="name"
                value={loginForm.name}
                onChange={handleChange}
                className="form-input"
                placeholder="Dr. Username"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={loginForm.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Submit'}
            </button>
          </form>
          <div className="signup-link">
            Not Registered? <a onClick={() => {
              localStorage.setItem('navigateTo', 'signup');
              window.location.reload();
            }}>Sign Up</a>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="content">
        <p className="welcome-text">
          Welcome to DiabAssist, the AI-Powered, evidence-based, real-time,
          deep-learning enabled, clinical assistance tool.
        </p>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-links">
          <a href="#">Privacy Statement</a>
          <span>|</span>
          <a href="#">Terms and Conditions</a>
          <span>|</span>
          <a href="#">Helpline</a>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default DoctorLogin;