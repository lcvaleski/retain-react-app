import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AuthForm.css';
import { useNavigate } from 'react-router-dom';

function AuthForm({ onSignupComplete }) {
  const { loginWithGoogle, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      setError('All fields are required');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const user = await signup(email, password);
      if (onSignupComplete) {
        await onSignupComplete(user);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setIsLoading(true);
      const user = await loginWithGoogle();
      if (onSignupComplete) {
        await onSignupComplete(user);
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="auth-form-title">Create Account to Save Voice</h2>

      <div className="form-group">
        <input
          type="email"
          className={`form-input ${error && email === '' ? 'error' : ''}`}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <input
          type="password"
          className={`form-input ${error && password === '' ? 'error' : ''}`}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <input
          type="password"
          className={`form-input ${error && confirmPassword === '' ? 'error' : ''}`}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button 
        type="submit" 
        className="submit-button"
        disabled={isLoading}
      >
        {isLoading ? 'Creating Account...' : 'Save Voice Clone'}
      </button>

      <div className="divider">
        <span>or</span>
      </div>

      <button
        type="button"
        className="google-button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        Continue with Google
      </button>

      <a href="#" className="forgot-password" onClick={() => {}}>
        Forgot Password?
      </a>
    </form>
  );
}

export default AuthForm; 