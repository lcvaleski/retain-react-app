import logo from './logo.svg';
import './App.css';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import AudioRecorder from './components/AudioRecorder';
import { Family1, Family2, Family3 } from './assets';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const { currentUser, logout, signInAnonymously } = useAuth();
  const [ttsText, setTtsText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [Family1, Family2, Family3];
  const [pendingVoiceId, setPendingVoiceId] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  
  console.log('Current user:', currentUser);

  const handleFileUpload = useCallback(async (fileOrEvent) => {
    const file = fileOrEvent.target?.files?.[0] || fileOrEvent;
    
    try {
      setError(null);
      setSuccessMessage(null);
      
      // Validate file
      if (!file) return;
      if (!file.type.startsWith('audio/')) {
        throw new Error(`Unsupported file type: ${file.type}. Please select an audio file`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size must be less than 10MB');
      }

      // Create anonymous account if user isn't logged in
      if (!currentUser) {
        await signInAnonymously();
        // Save the file for later upload
        setPendingFile(file);
        return;
      }

      setIsUploading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('audio', file);

      // Upload to backend
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseText = await response.text();
      console.log('Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        setResponseData(data); // Store the response data
        
        if (data.voiceId) {
          setPendingVoiceId(data.voiceId);
          setSuccessMessage('Voice cloned successfully!');
        }
      } catch (e) {
        console.error('Parse error:', {
          text: responseText,
          error: e.message
        });
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

  const generateSpeech = useCallback(async (voiceId, text) => {
    console.log('generateSpeech called with:', { voiceId, text });
    try {
      setIsGenerating(true);
      setError(null);
      
      console.log('Making fetch request to /api/tts');
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voiceId, text })
      });
      console.log('Received response:', { 
        ok: response.ok, 
        status: response.status,
        contentType: response.headers.get('content-type')
      });

      // Check if response is JSON (error) or audio (success)
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.details || 'TTS generation failed');
        } else {
          const text = await response.text();
          throw new Error(`TTS generation failed: ${text}`);
        }
      }

      // If we got here, we should have audio data
      console.log('Getting blob from response');
      const audioBlob = await response.blob();
      console.log('Creating URL from blob');
      const url = URL.createObjectURL(audioBlob);
      console.log('Setting audio URL:', url);
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
