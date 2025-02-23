import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

// Mock Firebase
jest.mock('./firebase', () => ({
  app: {},
  auth: {},
  analytics: {},
  db: {
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({
            docs: [],
            forEach: jest.fn()
          }))
        }))
      }))
    }))
  }
}));

// Mock the assets
jest.mock('./assets', () => ({
  Family1: '/mock/family1.png',
  Family2: '/mock/family2.png',
  Family3: '/mock/family3.png'
}));

// Mock AuthContext with a default value
const mockUseAuth = jest.fn().mockReturnValue({
  currentUser: null,
  logout: jest.fn()
});

// Mock AuthContext
jest.mock('./contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }) => children
}));

describe('App', () => {
  beforeEach(() => {
    // Reset mock before each test
    mockUseAuth.mockReturnValue({
      currentUser: null,
      logout: jest.fn()
    });
  });

  test('renders main heading', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    const textElement = screen.getByText(/We save photos, letters, and videos/i);
    expect(textElement).toBeInTheDocument();
  });

  test('shows auth form when not logged in', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      logout: jest.fn()
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(screen.queryByText(/Clone your voice/i)).not.toBeInTheDocument();
  });

  test('shows TTS section when logged in', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { email: 'test@example.com', isAnonymous: false },
      logout: jest.fn()
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(screen.getByPlaceholderText(/What would you like your voice to say/i)).toBeInTheDocument();
  });
});
