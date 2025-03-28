const Stripe = require('stripe');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
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
      projectId: 'retain-react'
    });

    console.log('[DEBUG] Firebase Admin initialized');
  } catch (err) {
    console.error('[DEBUG] Firebase Admin init error:', err);
    throw new Error('Firebase Admin failed: ' + err.message);
  }
}

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.NODE_ENV === 'production' 
  ? process.env.STRIPE_SECRET_KEY_LIVE 
  : process.env.STRIPE_SECRET_KEY_TEST
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = async (req, res) => {
  console.log('[DEBUG] Webhook received:', {
    headers: req.headers['stripe-signature'] ? 'Signature present' : 'No signature',
    hasRawBody: !!req.rawBody,
    method: req.method,
    contentType: req.headers['content-type']
  });

  try {
    const sig = req.headers['stripe-signature'];
    const buf = req.body;

    const event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Checkout session completed:', event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send();
  } catch (err) {
    console.error('[DEBUG] Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};