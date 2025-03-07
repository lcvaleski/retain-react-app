import React, { useState } from 'react';
import '../styles/VoicePurchase.css';

function VoicePurchase() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePurchase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Purchase error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="voice-purchase">
      <div className="purchase-card">
        <h3>Unlock More Voices</h3>
        <p className="price">$5</p>
        <ul className="features">
          <li>4 Additional Voice Clones</li>
          <li>Unlimited Usage</li>
          <li>Never Expires</li>
        </ul>
        <button 
          onClick={handlePurchase}
          disabled={isLoading}
          className="purchase-button"
        >
          {isLoading ? 'Processing...' : 'Purchase Now'}
        </button>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default VoicePurchase; 