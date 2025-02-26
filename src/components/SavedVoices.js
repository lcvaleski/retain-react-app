import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import '../styles/SavedVoices.css';

function SavedVoices({ voices, onSelect, selectedVoiceId, onCreateNew, onDelete }) {
  const { currentUser } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [voiceToDelete, setVoiceToDelete] = useState(null);
  
  const handleDeleteClick = (e, voice) => {
    e.stopPropagation(); // Prevent voice selection when clicking delete
    setVoiceToDelete(voice);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (voiceToDelete) {
      await onDelete(voiceToDelete.id);
      setShowDeleteModal(false);
      setVoiceToDelete(null);
    }
  };

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
          <div
            key={voice.id}
            className={`voice-item ${voice.voiceId === selectedVoiceId ? 'selected' : ''}`}
            onClick={() => onSelect(voice.voiceId)}
          >
            <span className="voice-name">{voice.name || 'Unnamed Voice'}</span>
            <button
              className="delete-voice-button"
              onClick={(e) => handleDeleteClick(e, voice)}
              title="Delete Voice"
            >
              ×
            </button>
          </div>
        ))}
        {(!voices || voices.length === 0) && (
          <div className="no-voices">
            No saved voices yet. Click the + button to create one.
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setVoiceToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Voice"
        message={`Are you sure you want to delete "${voiceToDelete?.name || 'this voice'}"? This action cannot be undone.`}
      />
    </div>
  );
}

export default SavedVoices; 