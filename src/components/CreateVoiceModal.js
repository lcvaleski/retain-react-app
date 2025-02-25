import React, { useState, useCallback } from 'react';
import AudioRecorder from './AudioRecorder';
import '../styles/CreateVoiceModal.css';

function CreateVoiceModal({ isOpen, onClose, onVoiceCreated }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [voiceName, setVoiceName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [voiceData, setVoiceData] = useState(null);

  const handleFileUpload = useCallback(async (fileOrEvent) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const file = fileOrEvent.target?.files?.[0] || fileOrEvent;
    
    try {
      setError(null);
      
      // File validation
      if (!file) {
        throw new Error('No file selected');
      }
      
      if (!file.type.startsWith('audio/')) {
        throw new Error(`Unsupported file type: ${file.type}. Please select an audio file`);
      }
      
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size must be less than 10MB');
      }

      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.message || 'Upload failed');
      }

      setVoiceData(data);
      setShowNameInput(true);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!voiceName.trim()) {
      setError('Please enter a name for your voice');
      return;
    }

    try {
      await onVoiceCreated(voiceData.voiceId, voiceName.trim());
      handleClose();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleClose = () => {
    setVoiceName('');
    setShowNameInput(false);
    setVoiceData(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={handleClose}>&times;</button>
        
        <h2>Create New Voice</h2>
        
        {!showNameInput ? (
          <div className="voice-upload-section">
            <p>Record or upload a 10-second voice sample</p>
            
            <AudioRecorder 
              onRecordingComplete={handleFileUpload}
              disabled={isUploading}
            />

            <div className="upload-divider">
              <span>or</span>
            </div>

            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              id="voice-upload"
              disabled={isUploading}
              style={{ display: 'none' }}
            />
            <label 
              htmlFor="voice-upload" 
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
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="voice-name-form">
            <div className="form-group">
              <label htmlFor="voice-name">Name your voice</label>
              <input
                type="text"
                id="voice-name"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., My Voice"
                maxLength={50}
                autoFocus
              />
            </div>
            
            <div className="modal-buttons">
              <button 
                type="button" 
                onClick={() => setShowNameInput(false)} 
                className="secondary-button"
              >
                Back
              </button>
              <button 
                type="submit" 
                className="primary-button"
              >
                Save Voice
              </button>
            </div>
          </form>
        )}

        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default CreateVoiceModal; 