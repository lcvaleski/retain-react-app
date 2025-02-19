import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

// Mock Firebase
jest.mock('./firebase', () => ({
  initializeFirebase: jest.fn().mockReturnValue({
    auth: {},
    app: {},
    analytics: {}
  })
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

  test('shows upload section when logged in', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { email: 'test@example.com' },
      logout: jest.fn()
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(screen.getByText(/Clone your voice/i)).toBeInTheDocument();
  });
});
