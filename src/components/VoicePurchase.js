import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/VoicePurchase.css';

function VoicePurchase({ isOpen, onClose }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  const handlePurchase = async () => {
    if (!currentUser) {
      setError('Please sign in to purchase voice clones');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.uid
        })
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }
      
      if (!data.url) {
        throw new Error('No checkout URL in server response');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Purchase error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <div className="voice-purchase">
          <div className="purchase-card">
            <h3>Unlock Premium Voices</h3>
            <div className="price">
              <span className="price-amount">
                <span className="price-currency">$</span>
                4.99
              </span>
              <span className="price-type">one-time payment</span>
            </div>
            <ul className="features">
              <li>4 Additional Voice Clones</li>
              <li>Unlimited Text-to-Speech Usage</li>
              <li>Premium Voice Quality</li>
              <li>One-Time Purchase, No Subscription</li>
            </ul>
            <button 
              onClick={handlePurchase}
              disabled={isLoading || !currentUser}
              className="purchase-button"
            >
              {isLoading ? 'Processing...' : 'Upgrade Now'}
            </button>
            {error && <p className="error-message">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoicePurchase; 