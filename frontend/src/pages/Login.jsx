import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await login(formData.email, formData.password);
      setSuccess('Authentication successful! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message || 
        err.response?.data?.error || 
        'Failed to connect to NOVA API'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <div className="logo-badge">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">NOVA</span>
          <span className="environment-tag">BaaS v1.0</span>
        </div>
        <h1>Sign in to Platform</h1>
        <p>Access your self-hosted backend infrastructure</p>
      </div>

      <div className="auth-card">
        <div className="status-banner">
          <span className="status-dot online"></span>
          <span className="status-text">Backend API Connected (Port 5000)</span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="developer@nova.local"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <div className="label-row">
              <label htmlFor="password">Password</label>
              <a href="#forgot" className="forgot-link">Forgot?</a>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign in to Dashboard'}
          </button>
        </form>
      </div>

      <div className="auth-footer">
        <p>New to NOVA? <Link to="/register">Create an account</Link></p>
        <div className="footer-links">
          <a href="#docs">Docs</a>
          <span>•</span>
          <a href="#api">API Reference</a>
          <span>•</span>
          <a href="#status">System Status</a>
        </div>
      </div>
    </div>
  );
}