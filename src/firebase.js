import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

let app = null;
let auth = null;
let analytics = null;

export async function initializeFirebase() {
  try {
    const response = await fetch('/api/get-firebase-config');
    if (!response.ok) {
      throw new Error('Failed to fetch Firebase configuration');
    }
    const firebaseConfig = await response.json();
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    analytics = getAnalytics(app);
    
    return { app, auth, analytics };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

export { app, auth, analytics }; 