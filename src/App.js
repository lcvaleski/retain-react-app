import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from 'react';

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

    try {
      setError(null);
      setSuccessMessage(null);
      
      // Validate file
      if (!file) return;
      if (!file.type.startsWith('audio/')) {
        throw new Error('Please select an audio file');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size must be less than 10MB');
      }

      setIsUploading(true);

      // Create form data
      const formData = new FormData();
      formData.append('audio', file);

      // Upload to backend
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Failed to parse response: ${responseText}`);
      }

      console.log('Upload successful:', data.url);
      setSuccessMessage('Audio uploaded successfully!');
      
    } catch (error) {
      console.error('Error details:', error);
      setError(error.message);
      setSuccessMessage(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo"/>
        <p>
          We save photos, letters, and videos of our loved ones.<br />
          Why not their voices?
        </p>
        <div className="upload-section">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            id="audio-upload"
            disabled={isUploading}
          />
          <label 
            htmlFor="audio-upload" 
            className={`upload-button ${isUploading ? 'uploading' : ''}`}
          >
            {isUploading ? 'Uploading...' : 'Upload Voice Recording'}
          </label>
          {error && <p className="error-message">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}
        </div>
      </header>
    </div>
  );
}

export default App;
