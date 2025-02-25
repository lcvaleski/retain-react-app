import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/SavedVoices.css';

function SavedVoices({ voices, onSelect, selectedVoiceId, onCreateNew }) {
  const { currentUser } = useAuth();

  if (!currentUser || currentUser.isAnonymous) {
    return null;
  }

  return (
    <div className="saved-voices">
      <div className="voices-header">
        <h3>Your Saved Voices</h3>
        <button 
          className="create-voice-button"
          onClick={onCreateNew}
          title="Create New Voice"
        >
          +
        </button>
      </div>
      <div className="voice-list">
        {voices?.map((voice) => (
          <button
            key={voice.id}
            className={`voice-item ${voice.voiceId === selectedVoiceId ? 'selected' : ''}`}
            onClick={() => onSelect(voice.voiceId)}
          >
            {voice.name || 'Unnamed Voice'}
          </button>
        ))}
        {(!voices || voices.length === 0) && (
          <div className="no-voices">
            No saved voices yet. Click the + button to create one.
          </div>
        )}
      </div>
    </div>
  );
}

export default SavedVoices; 