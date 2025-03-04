// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock assets
jest.mock('./assets', () => ({
  Family1: 'mock-image-url-1',
  Family2: 'mock-image-url-2',
  Family3: 'mock-image-url-3'
}));

// Mock the entire Firebase module
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getAuth: jest.fn(() => ({})),
  getFirestore: jest.fn(() => ({})),
  getAnalytics: jest.fn(() => ({}))
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  onAuthStateChanged: jest.fn()
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn()
}));

// Mock Firebase Analytics
jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({}))
}));

// Mock the Firebase module itself
jest.mock('./firebase', () => ({
  app: {},
  auth: {},
  analytics: {},
  db: {}
}));
