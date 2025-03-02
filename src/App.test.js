// Mock Firebase
jest.mock('./firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn()
  },
  db: {
    collection: jest.fn()
  },
  analytics: jest.fn()
}));

// Mock react-router-dom with Link component
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ children, path, element }) => null,
  Navigate: ({ to }) => null,
  Link: ({ children, to }) => <a href={to}>{children}</a>
}));

// Mock AuthContext
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children
}));

// Mock assets
jest.mock('./assets', () => ({
  Family1: 'mock-image-url-1',
  Family2: 'mock-image-url-2',
  Family3: 'mock-image-url-3'
}));

import { render } from '@testing-library/react';
import App from './App';

test('renders without crashing', () => {
  render(<App />);
});