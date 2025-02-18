import logo from './logo.svg';
import './App.css';
import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import AudioRecorder from './components/AudioRecorder';

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const { currentUser, logout } = useAuth();
  const [ttsText, setTtsText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  
  console.log('Current user:', currentUser);

  const handleLogout = async () => {
    try {
      await logout();
      setSuccessMessage('Logged out successfully!');
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    }
  };

  const handleFileUpload = async (fileOrEvent) => {
    // Handle both direct file objects and event.target.files
    const file = fileOrEvent.target?.files?.[0] || fileOrEvent;
    
    // Add debug logging for file type
    console.log('File details:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

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
      } catch (e) {
        console.error('Parse error:', {
          text: responseText,
          error: e.message
        });
        data = { error: `Failed to parse response: ${responseText.substring(0, 100)}...` };
      }

      // Store the full response data regardless of success/failure
      setResponseData(data);

      if (!response.ok) {
        throw new Error(data.details || data.message || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const generateSpeech = async (voiceId, text) => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voiceId, text })
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
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
    } catch (error) {
      console.error('TTS Error:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="main-content">
          <img src={logo} className="App-logo" alt="logo"/>
          <p>
            We save photos, letters, and videos of our loved ones.<br />
            Why not their voices?
          </p>
          {currentUser ? (
            <>
              <div className="upload-section">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  id="audio-upload"
                  disabled={isUploading}
                />
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
                
                <div className="or-divider">or</div>
                
                <AudioRecorder 
                  onRecordingComplete={handleFileUpload} 
                  disabled={isUploading}
                />
                
                {error && <p className="error-message">{error}</p>}
                {successMessage && <p className="success-message">{successMessage}</p>}
              </div>
              
              {responseData?.voiceId && (
                <div className="tts-container">
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="What would you like your voice to say?"
                    disabled={isGenerating}
                    className="tts-input"
                  />
                  <button
                    onClick={() => generateSpeech(responseData.voiceId, ttsText)}
                    disabled={!ttsText || isGenerating}
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
            </>
          ) : (
            <AuthForm />
          )}
        </div>
        
        {currentUser && (
          <div className="user-section">
            <p>Signed in as {currentUser.email}</p>
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
