// api/stripe-webhook.js

import { buffer } from 'micro';
import Stripe from 'stripe';
import admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false, // Stripe requires the raw body
  },
};

if (!admin.apps.length) {
  try {
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

    if (!base64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 is missing');
    }

    const json = Buffer.from(base64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(json);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'retain-react',
    });

    console.log('[DEBUG] Firebase Admin initialized');
  } catch (err) {
    console.error('[DEBUG] Firebase Admin init error:', err);
    throw new Error('Firebase Admin failed: ' + err.message);
  }
}

const stripe = new Stripe(
  process.env.NODE_ENV === 'production'
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST,
  {
    apiVersion: '2022-11-15', // Or your preferred Stripe API version
  }
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  console.log('[DEBUG] Webhook received:', {
    headers: req.headers['stripe-signature'] ? 'Signature present' : 'No signature',
    method: req.method,
    contentType: req.headers['content-type'],
  });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const rawBody = await buffer(req);
    const sig = req.headers['stripe-signature'];

    const event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Checkout session completed:', event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send('Received');
  } catch (err) {
    console.error('[DEBUG] Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}