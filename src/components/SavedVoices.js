import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ConfirmationModal from './ConfirmationModal';
import VoicePurchase from './VoicePurchase';
import '../styles/SavedVoices.css';

function SavedVoices({ voices, onSelect, selectedVoiceId, onCreateNew, onDelete }) {
  const { currentUser } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [voiceToDelete, setVoiceToDelete] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);
  const [lastPurchaseCheck, setLastPurchaseCheck] = useState(0);
  
  const MAX_VOICES = 4;
  const MAX_FREE_VOICES = 1;
  const availableSlots = MAX_VOICES - (voices?.length || 0);

  const checkPremiumStatus = useCallback(async () => {
    if (!currentUser) {
      console.log('[DEBUG] No current user, skipping premium check');
      return;
    }
    
    try {
      console.log('[DEBUG] Checking premium status for user:', currentUser.uid, 'Timestamp:', Date.now());
      const userRef = doc(db, 'users', currentUser.uid);
      console.log('[DEBUG] Fetching user document...');
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('[DEBUG] User document data:', JSON.stringify(userData, null, 2));
        
        // If they have purchased voices, they have premium
        const newPremiumStatus = userData.purchasedVoices > 0;
        console.log('[DEBUG] Setting premium status to:', newPremiumStatus);
        setHasPremium(newPremiumStatus);
        
        // Store in sessionStorage as backup
        try {
          sessionStorage.setItem('hasPremium', JSON.stringify(newPremiumStatus));
          sessionStorage.setItem('lastPremiumCheck', Date.now().toString());
        } catch (storageError) {
          console.error('[DEBUG] Failed to store premium status in sessionStorage:', storageError);
        }
      } else {
        console.log('[DEBUG] User document does not exist for uid:', currentUser.uid);
        // Try to get from sessionStorage as fallback
        try {
          const storedPremium = sessionStorage.getItem('hasPremium');
          if (storedPremium !== null) {
            console.log('[DEBUG] Using stored premium status:', storedPremium);
            setHasPremium(JSON.parse(storedPremium));
          }
        } catch (storageError) {
          console.error('[DEBUG] Failed to read from sessionStorage:', storageError);
        }
      }
    } catch (error) {
      console.error('[DEBUG] Error checking premium status:', error);
      // Try to get from sessionStorage as fallback
      try {
        const storedPremium = sessionStorage.getItem('hasPremium');
        if (storedPremium !== null) {
          console.log('[DEBUG] Using stored premium status after error:', storedPremium);
          setHasPremium(JSON.parse(storedPremium));
        }
      } catch (storageError) {
        console.error('[DEBUG] Failed to read from sessionStorage:', storageError);
      }
    }
  }, [currentUser]);

  // Check premium status on mount and when lastPurchaseCheck changes
  useEffect(() => {
    console.log('[DEBUG] Running premium status check effect', {
      currentUser: currentUser?.uid,
      lastPurchaseCheck,
      timestamp: Date.now()
    });
    
    // Immediate check
    checkPremiumStatus();
    
    // Retry after a short delay in case of race conditions
    const retryTimeout = setTimeout(() => {
      console.log('[DEBUG] Retrying premium status check after delay');
      checkPremiumStatus();
    }, 2000);

    return () => clearTimeout(retryTimeout);
  }, [currentUser, lastPurchaseCheck, checkPremiumStatus]);

  const handleDeleteClick = (e, voice) => {
    e.stopPropagation();
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

  const handleCreateNew = () => {
    if (voices.length >= MAX_FREE_VOICES && !hasPremium) {
      setShowPurchaseModal(true);
    } else {
      onCreateNew();
    }
  };

  const handlePurchaseComplete = useCallback(() => {
    console.log('[DEBUG] Purchase complete handler called', {
      timestamp: Date.now(),
      currentUser: currentUser?.uid
    });
    setShowPurchaseModal(false);
    // Force an immediate premium status check
    checkPremiumStatus();
    // Then set lastPurchaseCheck to trigger another check after a delay
    setLastPurchaseCheck(Date.now());
  }, [currentUser, checkPremiumStatus]);

  // Check URL parameters for payment success
  useEffect(() => {
    // Only run if we have a user
    if (!currentUser?.uid) {
      console.log('[DEBUG] No user available for payment check');
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    const paymentStatus = queryParams.get('payment');
    const sessionId = queryParams.get('session_id');
    console.log('[DEBUG] Checking payment status from URL:', {
      paymentStatus,
      sessionId,
      timestamp: Date.now(),
      currentUser: currentUser.uid
    });
    
    if (paymentStatus === 'success') {
      console.log('[DEBUG] Payment success detected in URL');
      
      // Set a flag in sessionStorage to persist the success state
      try {
        sessionStorage.setItem('lastSuccessfulPayment', JSON.stringify({
          timestamp: Date.now(),
          sessionId,
          userId: currentUser.uid
        }));
      } catch (error) {
        console.error('[DEBUG] Failed to store payment success in sessionStorage:', error);
      }

      handlePurchaseComplete();
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Schedule multiple rechecks to handle potential delays in webhook processing
      const checkTimes = [2000, 5000, 10000]; // 2s, 5s, 10s
      checkTimes.forEach(delay => {
        setTimeout(() => {
          console.log(`[DEBUG] Scheduled recheck after ${delay}ms`);
          checkPremiumStatus();
        }, delay);
      });
    }
  }, [currentUser, handlePurchaseComplete, checkPremiumStatus]);

  if (!currentUser || currentUser.isAnonymous) {
    return null;
  }

  return (
    <div className="saved-voices">
      <div className="voices-header">
        <h2>Your Saved Voices</h2>
        <button 
          className="create-voice-button"
          onClick={handleCreateNew}
          aria-label="Create new voice"
        >
          <span>+</span>
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
        {/* Show empty slots */}
        {Array.from({ length: availableSlots }).map((_, index) => (
          <div 
            key={`empty-slot-${index}`} 
            className="voice-item empty-slot"
            onClick={handleCreateNew}
          >
            <span className="empty-slot-text">
              {hasPremium ? 'Click to Create Voice' : 'Empty Slot'}
            </span>
          </div>
        ))}
        {(!voices || voices.length === 0) && (
          <div className="no-voices">
            Create your first voice clone by clicking the + button above.
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

      <VoicePurchase 
        isOpen={showPurchaseModal} 
        onClose={() => setShowPurchaseModal(false)}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
}

export default SavedVoices; 