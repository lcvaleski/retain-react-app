import logo from './logo.svg';
import './App.css';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import AudioRecorder from './components/AudioRecorder';
import { Family1, Family2, Family3 } from './assets';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Core state management for voice cloning and TTS functionality
function App() {
  // Upload and response states
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [responseData, setResponseData] = useState(null);  // Stores API response including voiceId
  
  // Authentication state from Firebase
  const { currentUser, logout, signInAnonymously } = useAuth();
  
  // Text-to-Speech states
  const [ttsText, setTtsText] = useState('');  // Text input for TTS
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);  // URL for generated audio playback
  
  // UI states
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [Family1, Family2, Family3];
  
  // Voice cloning states
  const [pendingVoiceId, setPendingVoiceId] = useState(null);  // Stores voiceId before account creation
  const [pendingFile, setPendingFile] = useState(null);  // Stores audio file before account creation

  console.log('Current user:', currentUser);

  // Main function to handle voice recording/file upload
  const handleFileUpload = useCallback(async (fileOrEvent) => {
    const file = fileOrEvent.target?.files?.[0] || fileOrEvent;
    
    try {
      // Reset states
      setError(null);
      setSuccessMessage(null);
      
      // File validation
      if (!file) return;
      if (!file.type.startsWith('audio/')) {
        throw new Error(`Unsupported file type: ${file.type}. Please select an audio file`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size must be less than 10MB');
      }

      // Anonymous user flow - create temporary account
      if (!currentUser) {
        await signInAnonymously();
        setPendingFile(file);  // Save file for later upload
        return;
      }

      setIsUploading(true);
      
      // Upload file to server
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });

      // Parse and handle response
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
        setResponseData(data);
        
        // Store voice ID and show success message
        if (data.voiceId) {
          setPendingVoiceId(data.voiceId);
          setSuccessMessage('Voice cloned successfully!');
        }
      } catch (e) {
        console.error('Parse error:', { text: responseText, error: e.message });
        throw new Error(`Failed to parse response: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.details || data.message || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Error details:', error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  }, [currentUser, signInAnonymously]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((current) => (current + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    // Check if we have a pending file and user just created account
    if (pendingFile && currentUser && !currentUser.isAnonymous) {
      handleFileUpload(pendingFile);
      setPendingFile(null);
    }
  }, [currentUser, pendingFile, handleFileUpload]);

  const handleLogout = async () => {
    try {
      await logout();
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    }
  };

  // Text-to-Speech generation function
  const generateSpeech = useCallback(async (voiceId, text) => {
    try {
      setIsGenerating(true);
      setError(null);
      
      // Make TTS API request
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, text })
      });

      // Handle errors
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.details || 'TTS generation failed');
        } else {
          const text = await response.text();
          throw new Error(`TTS generation failed: ${text}`);
        }
      }

      // Create audio URL for playback
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
    } catch (error) {
      console.error('TTS Error:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <div className="main-content">
          <img src={logo} className="App-logo" alt="logo"/>
          <p>
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
          {(!currentUser || currentUser.isAnonymous) && (
            <div className="upload-section">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                id="audio-upload"
                disabled={isUploading}
              />
              <p>Clone your voice below. Introduce yourself for 10 seconds.</p>
              <label 
                htmlFor="audio-upload" 
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
              <AudioRecorder 
                onRecordingComplete={handleFileUpload} 
                disabled={isUploading}
              />
            </div>
          )}

          {currentUser?.isAnonymous && (
            <div className="auth-prompt">
              <p>Great! To use your cloned voice, please create an account or sign in.</p>
              <AuthForm />
            </div>
          )}

          {currentUser && !currentUser.isAnonymous && (
            <div className="tts-container">
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="What would you like your voice to say?"
                disabled={isGenerating}
                className="tts-input"
              />
              <button
                onClick={() => {
                  console.log('Button clicked');
                  console.log('Current state:', { 
                    pendingVoiceId, 
                    responseData, 
                    ttsText, 
                    isGenerating 
                  });
                  
                  const voiceId = pendingVoiceId || (responseData && responseData.voiceId);
                  if (!voiceId) {
                    console.log('No voice ID found');
                    setError('No voice ID found. Please record your voice first.');
                    return;
                  }
                  if (!ttsText.trim()) {
                    console.log('No text entered');
                    setError('Please enter some text to speak');
                    return;
                  }
                  console.log('Calling generateSpeech with:', { voiceId, ttsText });
                  generateSpeech(voiceId, ttsText);
                }}
                disabled={!ttsText || isGenerating || (!pendingVoiceId && !responseData?.voiceId)}
                className={`speak-button ${isGenerating ? 'generating' : ''}`}
              >
                {isGenerating ? (
                  <div className="generate-progress">
                    <div className="spinner"></div>
                    <span>Generating audio...</span>
                  </div>
                ) : (
                  'Speak'
                )}
              </button>
              {audioUrl && (
                <div className="audio-player">
                  <audio controls src={audioUrl}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
          )}
          
          {error && <p className="error-message">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}
        </div>
        
        {currentUser && !currentUser.isAnonymous && (
          <div className="user-section">
            <p>Signed in as {currentUser.email || 'Anonymous User'}</p>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
