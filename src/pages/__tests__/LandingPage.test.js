import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LandingPage from '../LandingPage';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext');

// Mock fetch
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LandingPage', () => {
  const mockCurrentUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    isAnonymous: false
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock useAuth implementation
    useAuth.mockReturnValue({
      currentUser: mockCurrentUser,
      signInAnonymously: jest.fn(),
      loginWithGoogle: jest.fn(),
      login: jest.fn(),
      resetPassword: jest.fn()
    });

    // Mock fetch implementation
    global.fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ voiceId: 'test-voice-id' }),
        text: () => Promise.resolve(JSON.stringify({ voiceId: 'test-voice-id' }))
      })
    );
  });

  test('renders landing page with main content', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Get started by cloning your voice below/i)).toBeInTheDocument();
    expect(screen.getByText(/Introduce yourself for 10 seconds/i)).toBeInTheDocument();
  });

  test('handles file upload successfully', async () => {
    const mockFile = new File(['test audio'], 'test.mp3', { type: 'audio/mp3' });
    
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/Upload Voice Recording/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/upload', expect.any(Object));
    });
  });

  test('displays error for invalid file type', async () => {
    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/Upload Voice Recording/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
    });
  });

  test('handles Google login successfully', async () => {
    const mockLoginWithGoogle = jest.fn().mockResolvedValue(mockCurrentUser);
    useAuth.mockReturnValueOnce({
      currentUser: null,
      loginWithGoogle: mockLoginWithGoogle
    });

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    const googleButton = screen.getByText(/Sign in with Google/i);
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

//   test('handles email login successfully', async () => {
//     const mockLogin = jest.fn().mockResolvedValue(mockCurrentUser);
//     useAuth.mockReturnValueOnce({
//       currentUser: null,
//       login: mockLogin
//     });

//     render(
//       <BrowserRouter>
//         <LandingPage />
//       </BrowserRouter>
//     );

//     // Click the email login button to show the form
//     const emailLoginButton = screen.getByText(/Sign in with Email/i);
//     fireEvent.click(emailLoginButton);

//     // Wait for the form to appear
//     await waitFor(() => {
//       expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
//     });

//     const emailInput = screen.getByPlaceholderText(/Email/i);
//     const passwordInput = screen.getByPlaceholderText(/Password/i);
//     const form = screen.getByTestId('email-login-form');

//     fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
//     fireEvent.change(passwordInput, { target: { value: 'password123' } });
//     fireEvent.submit(form);

//     await waitFor(() => {
//       expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
//       expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
//     });
//   });

  // test('handles anonymous sign in when uploading voice', async () => {
  //   const mockSignInAnonymously = jest.fn().mockResolvedValue(mockCurrentUser);
  //   useAuth.mockReturnValueOnce({
  //     currentUser: null,
  //     signInAnonymously: mockSignInAnonymously
  //   });

  //   // Mock fetch to return a successful response
  //   global.fetch.mockImplementationOnce(() => 
  //     Promise.resolve({
  //       ok: true,
  //       text: () => Promise.resolve(JSON.stringify({ voiceId: 'test-voice-id' }))
  //     })
  //   );

  //   render(
  //     <BrowserRouter>
  //       <LandingPage />
  //     </BrowserRouter>
  //   );

  //   const mockFile = new File(['test audio'], 'test.mp3', { type: 'audio/mp3' });
  //   const fileInput = screen.getByLabelText(/Upload Voice Recording/i);
  //   fireEvent.change(fileInput, { target: { files: [mockFile] } });

  //   await waitFor(() => {
  //     expect(mockSignInAnonymously).toHaveBeenCalled();
  //     expect(global.fetch).toHaveBeenCalledWith('/api/upload', expect.any(Object));
  //   });
  // });

  test('redirects to dashboard if user is already authenticated', () => {
    useAuth.mockReturnValueOnce({
      currentUser: mockCurrentUser
    });

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
}); 