import logo from './logo.svg';
import './App.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import AudioRecorder from './components/AudioRecorder';
import { Family1, Family2, Family3 } from './assets';
import VoiceNameModal from './components/VoiceNameModal';
import SavedVoices from './components/SavedVoices';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Core state management for voice cloning and TTS functionality
function App() {
  // Upload and response states
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [responseData, setResponseData] = useState(null);  // Stores API response including voiceId
  
  // Authentication state from Firebase
  const { currentUser, logout, signInAnonymously, loginWithGoogle } = useAuth();
  
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
  const [showNameModal, setShowNameModal] = useState(false);
  const [savedVoices, setSavedVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);

  const prevUserIdRef = useRef(null);

  useEffect(() => {
    const currentUserId = currentUser?.uid;
    if (currentUserId !== prevUserIdRef.current) {
      console.log('User changed:', {
        uid: currentUser?.uid,
        email: currentUser?.email,
        isAnonymous: currentUser?.isAnonymous
      });
      prevUserIdRef.current = currentUserId;
    }
  }, [currentUser]);

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
          if (!currentUser.isAnonymous) {
            setShowNameModal(true);
          }
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
    console.log('generateSpeech called with:', { voiceId, text });
    try {
      setIsGenerating(true);
      setError(null);
      
      const requestBody = { voiceId, text };
      console.log('Making TTS request to /api/tts:', requestBody);
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('TTS response received:', { 
        status: response.status,
        ok: response.ok,
        statusText: response.statusText 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to generate speech: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      console.log('Audio blob received:', { 
        size: audioBlob.size,
        type: audioBlob.type 
      });
      
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (error) {
      console.error('generateSpeech error:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleVoiceSelect = (voiceId) => {
    console.log('Voice selected:', { voiceId, currentVoiceId: selectedVoiceId });
    setSelectedVoiceId(voiceId);
    setPendingVoiceId(voiceId);  // Update the pending voice ID for TTS
  };

  const handleSaveVoice = async (voiceId, voiceName) => {
    try {
      const voiceRef = await addDoc(collection(db, 'voices'), {
        userId: currentUser.uid,
        voiceId: voiceId,
        name: voiceName,
        createdAt: new Date()
      });

      const newVoice = {
        id: voiceRef.id,
        voiceId,
        name: voiceName
      };

      setSavedVoices(prev => [...prev, newVoice]);
      setSelectedVoiceId(voiceId);
      setShowNameModal(false);
      setSuccessMessage('Voice saved successfully!');
    } catch (error) {
      console.error('Save voice error:', error);
      setError('Failed to save voice: ' + error.message);
    }
  };

  // Add this effect to load saved voices when user logs in
  useEffect(() => {
    const loadSavedVoices = async () => {
      if (currentUser && !currentUser.isAnonymous) {
        try {
          const voicesQuery = query(
            collection(db, 'voices'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );

          const querySnapshot = await getDocs(voicesQuery);
          const voices = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setSavedVoices(voices);
        } catch (error) {
          console.error('Error loading voices:', error);
          setError('Failed to load saved voices');
        }
      }
    };

    loadSavedVoices();
  }, [currentUser]);

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
              <p>Get started by cloning your voice below. Introduce yourself for 10 seconds.</p>
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
              <SavedVoices 
                voices={savedVoices} 
                onSelect={handleVoiceSelect}
                selectedVoiceId={selectedVoiceId}
              />
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="What would you like your voice to say?"
                disabled={isGenerating}
                className="tts-input"
              />
              <button
                onClick={() => {
                  console.log('Speak button clicked');
                  console.log('Button state:', {
                    ttsText,
                    isGenerating,
                    pendingVoiceId,
                    responseData,
                    selectedVoiceId,
                    disabled: !ttsText || isGenerating || (!pendingVoiceId && !responseData?.voiceId)
                  });
                  
                  const voiceId = selectedVoiceId || pendingVoiceId || (responseData && responseData.voiceId);
                  if (!voiceId) {
                    console.log('No voice ID available:', { selectedVoiceId, pendingVoiceId, responseVoiceId: responseData?.voiceId });
                    setError('Please select a voice first');
                    return;
                  }
                  if (!ttsText.trim()) {
                    console.log('No text entered');
                    setError('Please enter some text to speak');
                    return;
                  }
                  console.log('Proceeding with generateSpeech:', { voiceId, ttsText });
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
      {showNameModal && (
        <VoiceNameModal
          isOpen={showNameModal}
          onClose={() => setShowNameModal(false)}
          onSave={handleSaveVoice}
          voiceId={pendingVoiceId || (responseData && responseData.voiceId)}
        />
      )}
      {!currentUser && (
        <div className="login-section">
          <button 
            onClick={() => loginWithGoogle()} 
            className="google-login-button"
          >
            Login with Google
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
