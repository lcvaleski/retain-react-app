const Stripe = require('stripe');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'retain-react'
    });
    
    console.log('[DEBUG] Firebase Admin initialized successfully');
  } catch (error) {
    console.error('[DEBUG] Firebase Admin initialization error:', error);
    throw new Error('Failed to initialize Firebase Admin: ' + error.message);
  }
}

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = async (req, res) => {
  console.log('[DEBUG] Webhook received:', {
    headers: req.headers['stripe-signature'] ? 'Signature present' : 'No signature',
    hasRawBody: !!req.rawBody,
    method: req.method,
    contentType: req.headers['content-type']
  });

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Get the raw body as a buffer
    const rawBody = req.rawBody;
    
    if (!rawBody || !sig) {
      console.error('[DEBUG] Missing raw body or signature:', {
        hasRawBody: !!rawBody,
        hasSignature: !!sig
      });
      return res.status(400).json({ error: 'Missing raw body or signature' });
    }

    try {
      // Verify the event with the raw body and signature
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      console.log('[DEBUG] Webhook verified successfully');
    } catch (err) {
      console.error(`[DEBUG] Webhook signature verification failed:`, err.message);
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    // Handle successful checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('[DEBUG] Processing successful checkout. Session ID:', session.id);
      
      try {
        const userId = session.metadata.userId;
        const voiceCount = parseInt(session.metadata.voiceCount);

        console.log('[DEBUG] Purchase details:', { userId, voiceCount, sessionId: session.id });

        if (!userId || !voiceCount) {
          throw new Error('Missing userId or voiceCount in session metadata');
        }

        const db = admin.firestore();
        const userRef = db.collection('users').doc(userId);
        
        // Use a transaction to safely update the voice count
        await db.runTransaction(async (transaction) => {
          console.log('[DEBUG] Starting Firestore transaction');
          const userDoc = await transaction.get(userRef);
          const userData = userDoc.data() || {};
          
          console.log('[DEBUG] Current user data:', JSON.stringify(userData, null, 2));
          
          // Calculate new total of purchased voices
          const currentPurchasedVoices = userData.purchasedVoices || 0;
          const newPurchasedVoices = currentPurchasedVoices + voiceCount;
          
          console.log('[DEBUG] Voice count update:', {
            current: currentPurchasedVoices,
            adding: voiceCount,
            new: newPurchasedVoices
          });

          // Update the user document
          const updateData = {
            purchasedVoices: newPurchasedVoices,
            lastPurchase: admin.firestore.FieldValue.serverTimestamp(),
            email: userData.email || session.customer_details?.email,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          console.log('[DEBUG] Updating user document with:', JSON.stringify(updateData, null, 2));
          
          transaction.set(userRef, updateData, { merge: true });
        });

        console.log('[DEBUG] Transaction completed successfully');

        // Log the purchase
        const purchaseDoc = await db.collection('purchases').add({
          userId: userId,
          sessionId: session.id,
          amount: session.amount_total,
          voiceCount: voiceCount,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'completed',
          customerEmail: session.customer_details?.email,
          paymentIntent: session.payment_intent
        });

        console.log('[DEBUG] Successfully processed payment for user:', userId, 'Purchase logged with ID:', purchaseDoc.id);
        
        return res.json({ 
          received: true,
          userId: userId,
          purchaseId: purchaseDoc.id
        });
        
      } catch (error) {
        console.error('[DEBUG] Error processing webhook:', error);
        console.error('[DEBUG] Error details:', {
          userId: session.metadata?.userId,
          sessionId: session.id,
          error: error.message,
          stack: error.stack
        });
        
        return res.status(500).json({ 
          error: 'Failed to process payment completion',
          details: error.message
        });
      }
    }

    // For all other event types, just acknowledge receipt
    console.log('[DEBUG] Received non-checkout event:', event.type);
    return res.json({ received: true });
    
  } catch (err) {
    console.error('[DEBUG] Webhook error:', err.message, '\nStack:', err.stack);
    return res.status(400).json({ error: err.message });
  }
}; 