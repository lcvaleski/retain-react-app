import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SavedVoices from '../components/SavedVoices';
import VoiceNameModal from '../components/VoiceNameModal';
import CreateVoiceModal from '../components/CreateVoiceModal';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import '../styles/Dashboard.css';

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
      } catch (error) {
        console.error('Error loading voices:', error);
        setError('Failed to load saved voices');
      }
    };

    fetchVoices();
  }, [currentUser]);

  const generateSpeech = async (voiceId, text) => {
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
    } catch (error) {
      console.error('generateSpeech error:', error);
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
        <SavedVoices 
          voices={savedVoices} 
          onSelect={setSelectedVoiceId}
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