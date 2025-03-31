import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
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
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, voiceId, name } = req.body;

    if (!userId || !voiceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save to Firestore
    await db.collection('voices').add({
      userId,
      voiceId,
      name: name || 'New Voice',
      createdAt: new Date()
    });

    res.status(200).json({ message: 'Voice saved successfully' });

  } catch (error) {
    console.error('Save voice error:', error);
    res.status(500).json({ 
      error: 'Failed to save voice', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
} 