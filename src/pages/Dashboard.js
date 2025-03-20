import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SavedVoices from '../components/SavedVoices';
import VoiceNameModal from '../components/VoiceNameModal';
import CreateVoiceModal from '../components/CreateVoiceModal';
import { db, analytics } from '../firebase';
import { logEvent } from 'firebase/analytics';
import { collection, query, where, getDocs, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import '../styles/Dashboard.css';
import VoicePurchase from '../components/VoicePurchase';

function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [savedVoices, setSavedVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);
  const [ttsText, setTtsText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) {
      navigate('/');
    } else {
      setIsLoading(false);
    }
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      setError('Failed to log out');
    }
  };

  // Only proceed with other effects if authenticated
  useEffect(() => {
    const fetchVoices = async () => {
      if (!currentUser || currentUser.isAnonymous) return;

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
        // Set the first voice as selected by default if there are voices and no voice is currently selected
        if (voices.length > 0 && !selectedVoiceId) {
          setSelectedVoiceId(voices[0].voiceId);
        }
      } catch (error) {
        console.error('Error loading voices:', error);
        setError('Failed to load saved voices');
      }
    };

    fetchVoices();
  }, [currentUser, selectedVoiceId]);

  // Track session engagement
  useEffect(() => {
    const sessionStartTime = Date.now();
    let lastInteractionTime = Date.now();
    let interactionCount = 0;

    const trackInteraction = () => {
      const now = Date.now();
      interactionCount++;
      
      // Log every 5 interactions or after 5 minutes
      if (interactionCount % 5 === 0 || now - lastInteractionTime > 300000) {
        try {
          logEvent(analytics, 'dashboard_engagement', {
            timeSpent: (now - sessionStartTime) / 1000,
            interactionCount,
            activeVoiceId: selectedVoiceId || 'none'
          });
        } catch (error) {
          console.error('Analytics error:', error);
        }
      }
      lastInteractionTime = now;
    };

    document.addEventListener('click', trackInteraction);
    document.addEventListener('keypress', trackInteraction);

    return () => {
      document.removeEventListener('click', trackInteraction);
      document.removeEventListener('keypress', trackInteraction);
      
      // Log final session stats
      try {
        logEvent(analytics, 'dashboard_session_end', {
          totalTime: (Date.now() - sessionStartTime) / 1000,
          totalInteractions: interactionCount
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }
    };
  }, [selectedVoiceId]);

  const generateSpeech = async (voiceId, text) => {
    const startTime = Date.now();
    
    logEvent(analytics, 'tts_generation_started', {
      voiceId: voiceId,
      characterCount: text.length
    });

    try {
      setIsGenerating(true);
      setError(null);
      
      const requestBody = { voiceId, text };
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to generate speech: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      
      // Cleanup previous audio URL if it exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      logEvent(analytics, 'tts_generation_completed', {
        voiceId: voiceId,
        duration: (Date.now() - startTime) / 1000,
        success: true,
        characterCount: text.length
      });
    } catch (error) {
      logEvent(analytics, 'tts_generation_error', {
        voiceId: voiceId,
        error: error.message,
        characterCount: text.length
      });
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveVoice = async (voiceId, voiceName) => {
    if (!currentUser) return;

    try {
      await addDoc(collection(db, 'voices'), {
        userId: currentUser.uid,
        voiceId: voiceId,
        name: voiceName,
        createdAt: new Date()
      });

      // Refresh the voices list
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
      setSelectedVoiceId(voiceId);
      setShowNameModal(false);
    } catch (error) {
      console.error('Save voice error:', error);
      setError('Failed to save voice: ' + error.message);
    }
  };

  const handleCreateVoice = async (voiceId, name) => {
    try {
      // Check if user has reached the limit
      if (savedVoices.length >= 4) {
        setError('You have reached the maximum limit of 4 voices. Please delete a voice to create a new one.');
        return;
      }

      await addDoc(collection(db, 'voices'), {
        userId: currentUser.uid,
        voiceId: voiceId,
        name: name,
        createdAt: new Date()
      });

      // Refresh the voices list
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
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating voice:', error);
      setError('Failed to create voice: ' + error.message);
    }
  };

  const handleDeleteVoice = async (voiceId) => {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'voices', voiceId));

      // Update the local state
      setSavedVoices(currentVoices => currentVoices.filter(voice => voice.id !== voiceId));

      // If the deleted voice was selected, clear the selection
      if (selectedVoiceId === savedVoices.find(v => v.id === voiceId)?.voiceId) {
        setSelectedVoiceId(null);
      }
    } catch (error) {
      console.error('Error deleting voice:', error);
      setError('Failed to delete voice: ' + error.message);
    }
  };

  // Track voice selection
  const handleVoiceSelect = (voiceId) => {
    setSelectedVoiceId(voiceId);
    logEvent(analytics, 'voice_selected', {
      voiceId
    });
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    // Get the voice name from saved voices
    const selectedVoice = savedVoices.find(voice => voice.voiceId === selectedVoiceId);
    const voiceName = selectedVoice?.name || 'voice';
    
    // Create a sanitized version of the text for the filename
    const textPreview = ttsText.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase();
    
    // Create filename with voice name, text preview, and timestamp
    const filename = `${voiceName}-${textPreview}-${Date.now()}.mp3`;
    
    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Track download event
    try {
      logEvent(analytics, 'audio_downloaded', {
        voiceId: selectedVoiceId,
        voiceName: voiceName,
        textLength: ttsText.length
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  // If loading or not authenticated, show loading state
  if (isLoading || !currentUser || currentUser.isAnonymous) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Voice Dashboard</h1>
        <div className="user-section">
          <span>{currentUser.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <VoicePurchase />
        <SavedVoices 
          voices={savedVoices} 
          onSelect={handleVoiceSelect}
          selectedVoiceId={selectedVoiceId}
          onCreateNew={() => setShowCreateModal(true)}
          onDelete={handleDeleteVoice}
        />

        <div className="tts-container">
          <textarea
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
            placeholder="What would you like your voice to say?"
            disabled={isGenerating}
            className="tts-input"
          />
          <button
            onClick={() => generateSpeech(selectedVoiceId, ttsText)}
            disabled={!ttsText || isGenerating || !selectedVoiceId}
            className={`speak-button ${isGenerating ? 'generating' : ''}`}
          >
            {isGenerating ? 'Generating...' : 'Speak'}
          </button>

          {audioUrl && (
            <div className="audio-player">
              <audio controls src={audioUrl}>
                Your browser does not support the audio element.
              </audio>
              <button 
                onClick={handleDownload}
                className="download-button"
                title="Download audio"
              >
                Download MP3
              </button>
            </div>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        <CreateVoiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onVoiceCreated={handleCreateVoice}
        />
      </main>

      {showNameModal && (
        <VoiceNameModal
          isOpen={showNameModal}
          onClose={() => setShowNameModal(false)}
          onSave={handleSaveVoice}
          voiceId={selectedVoiceId}
        />
      )}
    </div>
  );
}

export default Dashboard; 