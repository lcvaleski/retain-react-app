import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthForm.css';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { login, signup, loginWithGoogle, resetPassword } = useAuth();

  const validatePassword = (password) => {
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasNumber) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        // Password validation for signup
        const passwordError = validatePassword(password);
        if (passwordError) {
          setError(passwordError);
          return;
        }

        if (password !== passwordConfirm) {
          setError('Passwords do not match');
          return;
        }
        await signup(email, password);
      }
    } catch (err) {
      // Convert Firebase error messages to user-friendly messages
      switch (err.code) {
        case 'auth/invalid-credential':
          setError('Invalid email or password');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/email-already-in-use':
          setError('An account with this email already exists');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Please use a stronger password');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your internet connection');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please try again later');
          break;
        default:
          setError('An error occurred. Please try again');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      switch (err.code) {
        case 'auth/popup-closed-by-user':
          setError('Sign in cancelled');
          break;
        case 'auth/popup-blocked':
          setError('Pop-up blocked by browser. Please allow pop-ups for this site');
          break;
        case 'auth/cancelled-popup-request':
          // Don't show an error for this case as it's a normal user action
          break;
        default:
          setError('Unable to sign in with Google. Please try again');
      }
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      if (!email) {
        setError('Please enter your email address');
        return;
      }
      await resetPassword(email);
      setMessage('Check your email for password reset instructions');
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address');
          break;
        default:
          setError('Unable to send reset email. Please try again');
      }
    }
  };

  return (
    <div className="auth-form-container">
      <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
      {error && <div className="auth-error">{error}</div>}
      {message && <div className="auth-message">{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {!isLogin && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
        )}
        <button type="submit">
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
        {isLogin && (
          <button 
            type="button"
            className="forgot-password-button"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </button>
        )}
      </form>

      <div className="divider">
        <span>or</span>
      </div>

      <button 
        className="google-sign-in" 
        onClick={handleGoogleSignIn}
      >
        <img src="/google-icon.svg" alt="Google" />
        Continue with Google
      </button>

      <p className="auth-switch">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button 
          className="link-button"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Sign Up' : 'Login'}
        </button>
      </p>
    </div>
  );
} 