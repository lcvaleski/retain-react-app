import React from 'react';
import './SavedVoices.css';

function SavedVoices({ voices, onSelect, selectedVoiceId, onCreateNew }) {
  if (!voices || voices.length === 0) return null;

  return (
    <div className="saved-voices">
      <div className="voices-header">
        <h3>Your Saved Voices</h3>
        <button 
          className="create-voice-button"
          onClick={onCreateNew}
          title="Create New Voice"
        >
          <span>+</span>
        </button>
      </div>
      <div className="voice-list">
        {voices.map((voice) => (
          <button
            key={voice.id}
            className={`voice-item ${voice.voiceId === selectedVoiceId ? 'selected' : ''}`}
            onClick={() => onSelect(voice.voiceId)}
          >
            {voice.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SavedVoices; 