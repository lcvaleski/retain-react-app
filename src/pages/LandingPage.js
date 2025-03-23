import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/AuthForm';
import AudioRecorder from '../components/AudioRecorder';
import { Family1, Family2, Family3 } from '../assets';
import { collection } from 'firebase/firestore';
import { db } from '../firebase';
import { addDoc } from 'firebase/firestore';
import logo from '../assets/logo.svg';
import '../styles/LandingPage.css';

function LandingPage() {
  const { currentUser, signInAnonymously, loginWithGoogle, login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [Family1, Family2, Family3];
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [voiceData, setVoiceData] = useState(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  // Move the slideshow effect here
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((current) => (current + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  const handleFileUpload = useCallback(async (fileOrEvent) => {    
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const file = fileOrEvent.target?.files?.[0] || fileOrEvent;
    
    try {
      setError(null);
      setIsUploading(true);
      
      // File validation
      if (!file) {
        throw new Error('No file selected');
      }
      
      if (!file.type.startsWith('audio/')) {
        throw new Error(`Unsupported file type: ${file.type}. Please select an audio file`);
      }
      
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size must be less than 10MB');
      }

      const formData = new FormData();
      formData.append('audio', file);
      
      if (currentUser?.uid) {
        formData.append('userId', currentUser.uid);
      }

      // Add request ID for tracking
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      formData.append('requestId', requestId);

      console.log(`Starting upload (${requestId}):`, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const responseText = await response.text();
      console.log(`Upload response (${requestId}):`, responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error(`Parse error (${requestId}):`, {
          text: responseText,
          error: e
        });
        throw new Error(
          response.ok 
            ? 'Invalid server response' 
            : `Server error: ${response.status} ${response.statusText}`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.message || 'Upload failed');
      }

      // Make sure we have a voiceId before setting voiceData
      if (!data.voiceId) {
        throw new Error('No voice ID returned from server');
      }

      // Handle successful upload
      if (currentUser && !currentUser.isAnonymous) {
        try {
          await addDoc(collection(db, 'voices'), {
            userId: currentUser.uid,
            voiceId: data.voiceId,
            name: 'New Voice',
            createdAt: new Date()
          });
          navigate('/dashboard');
        } catch (dbError) {
          console.error('Database error:', dbError);
          throw new Error('Failed to save voice to database');
        }
      } else {
        // Set full voice data
        setVoiceData({
          voiceId: data.voiceId,
          language: data.language,
          createdAt: data.createdAt
        });
        
        if (!currentUser) {
          console.log('Creating anonymous account...');
          await signInAnonymously();
        }
      }

    } catch (error) {
      console.error('Upload error:', {
        message: error.message,
        stack: error.stack,
        file: file ? {
          name: file.name,
          type: file.type,
          size: file.size
        } : null
      });
      setError(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [currentUser, navigate, signInAnonymously]);

  // Handle authenticated users
  useEffect(() => {
    // If user is already logged in (not anonymous) and there's no pending voice upload
    // redirect them to dashboard
    if (currentUser && !currentUser.isAnonymous && !voiceData) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate, voiceData]);

  // Handle authentication changes and voice data
  useEffect(() => {
    const saveVoiceAndRedirect = async () => {

      if (currentUser && !currentUser.isAnonymous && voiceData) {
        try {
          await addDoc(collection(db, 'voices'), {
            userId: currentUser.uid,
            voiceId: voiceData.voiceId,
            name: 'New Voice',
            createdAt: new Date()
          });
          
          setVoiceData(null);
          
          navigate('/dashboard');
        } catch (error) {
          console.error('Error saving voice:', error);
          setError('Failed to save voice: ' + error.message);
        }
      }
    };

    saveVoiceAndRedirect();
  }, [currentUser, voiceData, navigate]);

  // Let's also modify the AuthForm component to properly handle the signup completion
  const handleSignupComplete = useCallback(async (user) => {
    if (voiceData && voiceData.voiceId) {
      try {
        console.log('Saving voice after signup:', {
          userId: user.uid,
          voiceData
        });

        await addDoc(collection(db, 'voices'), {
          userId: user.uid,
          voiceId: voiceData.voiceId,
          name: 'New Voice',
          createdAt: new Date()
        });
        
        setVoiceData(null);
        navigate('/dashboard');
      } catch (error) {
        console.error('Error saving voice after signup:', {
          error,
          voiceData,
          userId: user.uid
        });
        setError('Failed to save voice after signup: ' + error.message);
      }
    } else {
      console.warn('No valid voice data found:', voiceData);
      navigate('/dashboard');
    }
  }, [voiceData, navigate]);

  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      if (voiceData && voiceData.voiceId) {
        await addDoc(collection(db, 'voices'), {
          userId: user.uid,
          voiceId: voiceData.voiceId,
          name: 'New Voice',
          createdAt: new Date()
        });
        setVoiceData(null);
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      setError('Failed to login with Google: ' + error.message);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to sign in: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await resetPassword(email);
      setResetMessage('Check your email for password reset instructions');
    } catch (err) {
      setError('Failed to reset password: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="hero-section">
        <img src={logo} className="App-logo" alt="logo"/>
        <p className="hero-text">
          We save photos, letters, and videos of our loved ones.<br />
          Why not their voices?
        </p>
        
        <div className="family-slideshow">
          {images.map((image, index) => (
            <img
              key={index}
              src={image}
              className={`family-image ${index === currentImageIndex ? 'visible' : ''}`}
              alt={`Family illustration ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="upload-container">
        <h1 className="upload-title">Get started by cloning your voice below.</h1>
        <p className="upload-subtitle">Introduce yourself for 10 seconds.</p>
        
        <div className="voice-upload-section">
          <AudioRecorder 
            onRecordingComplete={handleFileUpload}
            disabled={isUploading}
          />

          <div className="upload-divider">
            <span>or</span>
          </div>

          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            id="voice-upload"
            disabled={isUploading}
            style={{ display: 'none' }}
          />
          <label 
            htmlFor="voice-upload" 
            className={`upload-button ${isUploading ? 'uploading' : ''}`}
          >
            {isUploading ? (
              <div className="upload-progress">
                <div className="spinner"></div>
                <span>Processing voice...</span>
              </div>
            ) : (
              'Upload Voice Recording'
            )}
          </label>
          <div className="file-types-hint">Supported formats: MP3, WAV, M4A (max 10MB)</div>
        </div>

        {error && <p className="error-message">{error}</p>}

        {currentUser?.isAnonymous && voiceData && (
          <div className="auth-prompt">
            <AuthForm onSignupComplete={handleSignupComplete} />
          </div>
        )}
      </div>

      <div className="login-section">
        <p className="login-text">Already have an account?</p>
        <div className="auth-options">
          <button 
            className="google-login-button"
            onClick={handleGoogleLogin}
            disabled={isUploading}
          >
            Sign in with Google
          </button>
          {!showEmailLogin ? (
            <button 
              className="login-option-btn"
              onClick={() => setShowEmailLogin(true)}
            >
              Sign in with Email
            </button>
          ) : (
            <form 
              onSubmit={handleEmailLogin} 
              className="email-login-form"
              data-testid="email-login-form"
            >
              {error && <div className="error-message">{error}</div>}
              {resetMessage && <div className="success-message">{resetMessage}</div>}
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
              <button
                className="login-submit-btn"
                type="submit"
                data-testid="email-login-submit"
              >
                Sign in
              </button>
              <button 
                type="button"
                className="forgot-password-btn"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot Password?
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default LandingPage;