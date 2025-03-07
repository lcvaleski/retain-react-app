import React, { useState } from 'react';
import '../styles/VoicePurchase.css';

function VoicePurchase() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePurchase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting checkout process...');
      
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const textResponse = await response.text();
      console.log('Raw response body:', textResponse);
      
      let data;
      try {
        data = JSON.parse(textResponse);
        console.log('Parsed response data:', data);
      } catch (parseError) {
        console.error('JSON Parse error:', {
          error: parseError,
          receivedText: textResponse
        });
        throw new Error('Server response not valid JSON');
      }

      if (!response.ok) {
        const errorMessage = data.error?.message || data.error || 'Server error';
        throw new Error(errorMessage);
      }
      
      if (!data.url) {
        console.error('Missing URL in response:', data);
        throw new Error('No checkout URL in server response');
      }

      console.log('Redirecting to checkout:', data.url);
      window.location.href = data.url;
    } catch (error) {
      console.error('Purchase error details:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      setError(typeof error.message === 'string' ? error.message : 'Failed to create checkout session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="voice-purchase">
      <div className="purchase-card">
        <h3>Unlock More Voices</h3>
        <p className="price">$4.99</p>
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