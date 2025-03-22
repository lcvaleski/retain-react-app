import React, { useState, useEffect } from 'react';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import '../styles/ShareVoiceModal.css';

function ShareVoiceModal({ isOpen, onClose, voice, generatedAudio, publicUrl }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  
  // Remove all the upload logic since we now receive publicUrl directly
  
  // Don't render if modal is closed or no audio is available
  if (!isOpen || !generatedAudio) return null;

  const shareText = `Listen to this message in my voice, created with Retain!`;
  
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + publicUrl)}`
  };

  const handleShare = async (platform) => {
    if (!publicUrl) return;

    try {
      if (platform === 'copy') {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else if (platform === 'native' && navigator.share) {
        await navigator.share({
          title: 'Listen to my AI Voice Message',
          text: shareText,
          url: publicUrl
        });
      } else {
        window.open(shareLinks[platform], '_blank');
      }

      logEvent(analytics, 'audio_shared', {
        platform,
        voiceId: voice?.voiceId,
        hasAudio: true
      });
    } catch (error) {
      console.error('Share error:', error);
      setError('Failed to share audio');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="share-modal">
        <h2>Share Audio Message</h2>
        {error ? (
          <p className="error-message">{error}</p>
        ) : (
          <>
            <p>Share your AI-generated voice message with others!</p>

            <div className="audio-preview">
              <audio controls src={generatedAudio}>
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="share-buttons">
              {publicUrl ? (
                <>
                  {navigator.share && (
                    <button onClick={() => handleShare('native')} className="share-button native">
                      <i className="fas fa-share-alt"></i>
                      Share
                    </button>
                  )}

                  <button onClick={() => handleShare('twitter')} className="share-button twitter">
                    <i className="fab fa-twitter"></i>
                    X
                  </button>
                  
                  <button onClick={() => handleShare('facebook')} className="share-button facebook">
                    <i className="fab fa-facebook"></i>
                    Facebook
                  </button>
                  
                  <button onClick={() => handleShare('whatsapp')} className="share-button whatsapp">
                    <i className="fab fa-whatsapp"></i>
                    WhatsApp
                  </button>

                  <button onClick={() => handleShare('copy')} className="share-button copy">
                    <i className="fas fa-link"></i>
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </>
              ) : (
                <p>Preparing sharing link...</p>
              )}
            </div>
          </>
        )}

        <button onClick={onClose} className="close-button">
          Close
        </button>
      </div>
    </div>
  );
}

export default ShareVoiceModal; 