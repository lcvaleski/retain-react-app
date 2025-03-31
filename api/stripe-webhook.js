// api/stripe-webhook.js

import Stripe from 'stripe';
import { cert } from 'firebase-admin/app';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false, // Need raw body for Stripe signature verification
  },
};

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    if (!base64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 is missing');
    }

    const json = Buffer.from(base64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(json);

    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'retain-react'
    });
  } catch (err) {
    console.error('Firebase Admin init error:', err);
    throw new Error('Firebase Admin failed: ' + err.message);
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await buffer(req);
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      throw new Error('No Stripe signature found');
    }

    const event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log('Webhook event received:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;

        if (!userId) {
          throw new Error('No userId in session metadata');
        }

        const db = getFirestore();
        const userRef = db.collection('users').doc(userId);

        await db.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          
          if (!userDoc.exists) {
            transaction.set(userRef, {
              purchasedVoices: 4,
              updatedAt: new Date(),
              createdAt: new Date(),
              lastPurchase: {
                sessionId: session.id,
                timestamp: new Date()
              }
            });
          } else {
            transaction.update(userRef, {
              purchasedVoices: userDoc.data().purchasedVoices + 4,
              updatedAt: new Date(),
              lastPurchase: {
                sessionId: session.id,
                timestamp: new Date()
              }
            });
          }
        });

        console.log(`Successfully updated user ${userId} with purchase`);
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({
      error: `Webhook Error: ${err.message}`
    });
  }
}