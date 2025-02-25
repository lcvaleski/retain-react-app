import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously as firebaseSignInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  async function signInAnonymously() {
    try {
      const result = await firebaseSignInAnonymously(auth);
      return result.user;
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      throw error;
    }
  }

  async function linkAnonymousWithEmail(email, password) {
    if (!currentUser?.isAnonymous) {
      throw new Error('User is not anonymous');
    }

    const credential = EmailAuthProvider.credential(email, password);
    
    try {
      const result = await linkWithCredential(currentUser, credential);
      return result.user;
    } catch (error) {
      console.error('Account linking failed:', error);
      throw error;
    }
  }

  async function signup(email, password) {
    try {
      let userCredential;
      if (currentUser?.isAnonymous) {
        // If user is anonymous, link the account
        const credential = EmailAuthProvider.credential(email, password);
        userCredential = await linkWithCredential(currentUser, credential);
      } else {
        // If no user exists, create a new account
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      return userCredential.user;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async function login(email, password) {
    if (currentUser?.isAnonymous) {
      return linkAnonymousWithEmail(email, password);
    }
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    return auth.signOut();
  }

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  }

  const value = {
    currentUser,
    login,
    signup,
    logout,
    resetPassword,
    signInAnonymously,
    linkAnonymousWithEmail,
    loginWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 