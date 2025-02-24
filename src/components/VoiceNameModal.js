import React, { useState } from 'react';
import './VoiceNameModal.css';

function VoiceNameModal({ isOpen, onClose, onSave, voiceId }) {
  const [voiceName, setVoiceName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!voiceName.trim()) {
      setError('Please enter a name for this voice');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await onSave(voiceId, voiceName.trim());
      setVoiceName('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save voice');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Name Your Voice</h2>
        <p>Give this voice clone a name to help you remember it</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="e.g., Mom's Voice"
            maxLength={50}
            autoFocus
            disabled={isCreating}
          />
          {error && <p className="error-message">{error}</p>}
          
          <div className="modal-buttons">
            <button 
              type="button" 
              onClick={onClose} 
              className="cancel-button"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-button"
              disabled={isCreating}
            >
              {isCreating ? 'Saving...' : 'Save Voice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VoiceNameModal; 