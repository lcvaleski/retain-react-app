import React from 'react';
import Modal from './common/Modal';
import '../styles/DeleteVoiceModal.css';

function DeleteVoiceModal({ isOpen, onClose, onConfirm, isDeleting }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="delete-voice-modal">
        <h3>Delete Voice Clone</h3>
        <p>
          Are you sure you want to delete this voice? 
          This action cannot be undone.
        </p>
        <div className="delete-modal-buttons">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            className="delete-button" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Voice'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteVoiceModal; 