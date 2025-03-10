import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebase';
import '../styles/VoicePurchase.css';

function VoicePurchase({ isOpen, onClose }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const modalOpenTimeRef = useRef(null);

  // Track modal open
  useEffect(() => {
    if (isOpen) {
      modalOpenTimeRef.current = Date.now();
      try {
        logEvent(analytics, 'purchase_modal_opened', {
          userType: currentUser ? 'registered' : 'anonymous'
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }
    }
  }, [isOpen, currentUser]);

  const handlePurchase = async () => {
    if (!currentUser) {
      setError('Please sign in to purchase voice clones');
      try {
        logEvent(analytics, 'purchase_error', {
          error: 'not_signed_in'
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Track checkout start
      try {
        logEvent(analytics, 'begin_checkout', {
          currency: 'USD',
          value: 4.99,
          items: [{
            name: 'Voice Pack',
            quantity: 1,
            price: 4.99
          }]
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }
      
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

      // Track redirect to checkout
      try {
        logEvent(analytics, 'checkout_started', {
          sessionId: data.sessionId
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Purchase error:', error);
      setError(error.message);
      
      try {
        logEvent(analytics, 'checkout_error', {
          error: error.message
        });
      } catch (analyticsError) {
        console.error('Analytics error:', analyticsError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Track modal close without purchase
  const handleClose = () => {
    if (modalOpenTimeRef.current) {
      try {
        logEvent(analytics, 'purchase_modal_closed', {
          timeSpent: Date.now() - modalOpenTimeRef.current
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>&times;</button>
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