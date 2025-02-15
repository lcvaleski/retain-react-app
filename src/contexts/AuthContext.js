import React, { createContext, useState, useContext, useEffect } from 'react';
import { initializeFirebase } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe;
    
    const initialize = async () => {
      try {
        const { auth: firebaseAuth } = await initializeFirebase();
        setAuth(firebaseAuth);
        
        unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
          setCurrentUser(user);
          setLoading(false);
        });
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    initialize();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function signup(email, password) {
    if (!auth) {
      throw new Error('Authentication not initialized');
    }
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function login(email, password) {
    if (!auth) {
      throw new Error('Authentication not initialized');
    }
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    if (!auth) {
      throw new Error('Authentication not initialized');
    }
    return signOut(auth);
  }

  async function loginWithGoogle() {
    if (!auth) {
      throw new Error('Authentication not initialized');
    }
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  async function resetPassword(email) {
    if (!auth) {
      throw new Error('Authentication not initialized');
    }
    return sendPasswordResetEmail(auth, email);
  }

  const value = {
    currentUser,
    signup,
    login,
    logout,
    loginWithGoogle,
    resetPassword,
    error,
    loading
  };

  if (error) {
    return <div>Error initializing authentication: {error}</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 