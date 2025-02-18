import logo from './logo.svg';
import './App.css';
import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const { currentUser, logout } = useAuth();
  
  console.log('Current user:', currentUser);

  const handleLogout = async () => {
    try {
      await logout();
      setSuccessMessage('Logged out successfully!');
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    
    // Add debug logging for file type
    console.log('File details:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

    try {
      setError(null);
      setSuccessMessage(null);
      
      // Validate file
      if (!file) return;
      if (!file.type.startsWith('audio/')) {
        throw new Error(`Unsupported file type: ${file.type}. Please select an audio file`);
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

      const responseText = await response.text();
      console.log('Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Parse error:', {
          text: responseText,
          error: e.message
        });
        data = { error: `Failed to parse response: ${responseText.substring(0, 100)}...` };
      }

      // Store the full response data regardless of success/failure
      setResponseData(data);

      if (!response.ok) {
        throw new Error(data.details || data.message || 'Upload failed');
      }

      setSuccessMessage('Audio uploaded successfully!');
      
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setError(error.message);
      setSuccessMessage(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="main-content">
          <img src={logo} className="App-logo" alt="logo"/>
          <p>
            We save photos, letters, and videos of our loved ones.<br />
            Why not their voices?
          </p>
          {currentUser ? (
            <>
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
                
                {/* Add response data display */}
                {responseData && (
                  <div className="response-data">
                    <h3>Response Data:</h3>
                    <pre>{JSON.stringify(responseData, null, 2)}</pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <AuthForm />
          )}
        </div>
        
        {currentUser && (
          <div className="user-section">
            <p>Signed in as {currentUser.email}</p>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
