const Stripe = require('stripe');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'retain-react' // your Firebase project ID
  });
}

const stripe = new Stripe(process.env.NODE_ENV === 'production' 
  ? process.env.STRIPE_SECRET_KEY_LIVE 
  : process.env.STRIPE_SECRET_KEY_TEST
);

module.exports = async (req, res) => {
  console.log('Webhook received:', new Date().toISOString());
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('Webhook event type:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Processing successful checkout. Session ID:', session.id);
    
    try {
      const userId = session.metadata.userId;
      const voiceCount = parseInt(session.metadata.voiceCount);

      console.log('Purchase details:', { userId, voiceCount });

      if (!userId || !voiceCount) {
        throw new Error('Missing userId or voiceCount in session metadata');
      }

      const db = admin.firestore();
      
      // Create users collection if it doesn't exist
      const userRef = db.collection('users').doc(userId);
      
      // Create purchases collection if it doesn't exist
      const purchasesRef = db.collection('purchases');

      console.log('Updating user document:', userId);
      
      // Use a transaction to safely update the voice count
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data() || {};
        
        console.log('Current user data:', userData);
        
        // Calculate new total of purchased voices
        const currentPurchasedVoices = userData.purchasedVoices || 0;
        const newPurchasedVoices = currentPurchasedVoices + voiceCount;
        
        console.log('Voice count update:', {
          current: currentPurchasedVoices,
          adding: voiceCount,
          new: newPurchasedVoices
        });

        // Update the user document
        transaction.set(userRef, {
          purchasedVoices: newPurchasedVoices,
          lastPurchase: admin.firestore.FieldValue.serverTimestamp(),
          email: userData.email || session.customer_details?.email,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });

      // Log the purchase
      const purchaseDoc = await purchasesRef.add({
        userId: userId,
        sessionId: session.id,
        amount: session.amount_total,
        voiceCount: voiceCount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed',
        customerEmail: session.customer_details?.email,
        paymentIntent: session.payment_intent
      });

      console.log('Purchase logged with ID:', purchaseDoc.id);
      console.log('Successfully processed payment for user:', userId);
      
      res.json({ 
        received: true,
        userId: userId,
        purchaseId: purchaseDoc.id
      });
      
    } catch (error) {
      console.error('Error processing webhook:', error);
      console.error('Error details:', {
        userId: session.metadata?.userId,
        sessionId: session.id,
        error: error.message
      });
      
      return res.status(500).json({ 
        error: 'Failed to process payment completion',
        details: error.message
      });
    }
  } else {
    // For all other event types, just acknowledge receipt
    console.log('Received non-checkout event:', event.type);
    res.json({ received: true });
  }
}; 