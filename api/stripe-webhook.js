const Stripe = require('stripe');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'retain-react' // your Firebase project ID
  });
}

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Get the raw body as a buffer
    const rawBody = req.rawBody;
    
    if (!rawBody || !sig) {
      console.error('Missing raw body or signature');
      return res.status(400).json({ error: 'Missing raw body or signature' });
    }

    try {
      // Verify the event with the raw body and signature
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      console.log('Webhook verified successfully');
    } catch (err) {
      console.error(`Webhook signature verification failed:`, err.message);
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
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
        const userRef = db.collection('users').doc(userId);
        
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
        await db.collection('purchases').add({
          userId: userId,
          sessionId: session.id,
          amount: session.amount_total,
          voiceCount: voiceCount,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'completed',
          customerEmail: session.customer_details?.email,
          paymentIntent: session.payment_intent
        });

        console.log('Successfully processed payment for user:', userId);
        
        return res.json({ received: true });
        
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
    }

    // For all other event types, just acknowledge receipt
    console.log('Received non-checkout event:', event.type);
    return res.json({ received: true });
    
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).json({ error: err.message });
  }
}; 