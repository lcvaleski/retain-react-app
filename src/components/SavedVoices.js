import React from 'react';
import './SavedVoices.css';

function SavedVoices({ voices, onSelect, selectedVoiceId }) {
  if (!voices || voices.length === 0) return null;

  return (
    <div className="saved-voices">
      <h3>Your Saved Voices</h3>
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