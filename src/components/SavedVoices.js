import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import VoicePurchase from './VoicePurchase';
import '../styles/SavedVoices.css';
import DeleteVoiceModal from './DeleteVoiceModal';

function SavedVoices({ voices, onSelect, selectedVoiceId, onCreateNew, onDelete }) {
  const { currentUser } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [voiceToDelete, setVoiceToDelete] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);
  const [lastPurchaseCheck, setLastPurchaseCheck] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
        console.log('[DEBUG] User document does not exist, creating it...');
        try {
          // Create the user document with default values
          await setDoc(userRef, {
            email: currentUser.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            purchasedVoices: 0,
            uid: currentUser.uid
          });
          console.log('[DEBUG] Created new user document');
          
          // Set default premium status
          setHasPremium(false);
          
          // Store in sessionStorage
          try {
            sessionStorage.setItem('hasPremium', 'false');
            sessionStorage.setItem('lastPremiumCheck', Date.now().toString());
          } catch (storageError) {
            console.error('[DEBUG] Failed to store premium status in sessionStorage:', storageError);
          }
        } catch (createError) {
          console.error('[DEBUG] Failed to create user document:', createError);
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

  const handleDeleteClick = (voice) => {
    setVoiceToDelete(voice);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!voiceToDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(voiceToDelete.id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete voice:', error);
    } finally {
      setIsDeleting(false);
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
        const paymentData = {
          timestamp: Date.now(),
          sessionId,
          userId: currentUser.uid
        };
        sessionStorage.setItem('lastSuccessfulPayment', JSON.stringify(paymentData));
        
        // Attempt to manually update the document if webhook hasn't done it
        const verifyAndUpdateDocument = async () => {
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log('[DEBUG] Verifying document update after purchase:', userData);
              
              // If purchasedVoices is still 0 after success URL, attempt update
              if (userData.purchasedVoices === 0) {
                console.log('[DEBUG] Document not updated by webhook, attempting manual update');
                await setDoc(userRef, {
                  ...userData,
                  purchasedVoices: 4,
                  lastManualUpdate: {
                    timestamp: serverTimestamp(),
                    sessionId,
                    reason: 'webhook_fallback'
                  },
                  updatedAt: serverTimestamp()
                }, { merge: true });
                console.log('[DEBUG] Manual document update completed');
              }
            }
          } catch (error) {
            console.error('[DEBUG] Error in verifyAndUpdateDocument:', error);
          }
        };

        // Check and update document after delays to allow webhook time to process
        const updateCheckTimes = [3000, 8000, 15000]; // 3s, 8s, 15s
        updateCheckTimes.forEach(delay => {
          setTimeout(async () => {
            console.log(`[DEBUG] Verifying document update after ${delay}ms`);
            await verifyAndUpdateDocument();
          }, delay);
        });
      } catch (error) {
        console.error('[DEBUG] Failed to handle payment success:', error);
      }

      handlePurchaseComplete();
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Schedule multiple rechecks to handle potential delays in webhook processing
      const checkTimes = [2000, 5000, 10000, 20000]; // 2s, 5s, 10s, 20s
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
        <h2>Saved Voices</h2>
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
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(voice);
              }}
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

      <DeleteVoiceModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setVoiceToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        voiceName={voiceToDelete?.name || ''}
        isDeleting={isDeleting}
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