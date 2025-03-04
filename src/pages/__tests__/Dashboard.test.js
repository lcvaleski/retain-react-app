import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Dashboard from '../Dashboard';

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

describe('Dashboard', () => {
  const mockCurrentUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    isAnonymous: false
  };

  const mockVoices = [
    { id: '1', voiceId: 'voice1', name: 'Voice 1', createdAt: new Date() },
    { id: '2', voiceId: 'voice2', name: 'Voice 2', createdAt: new Date() }
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock useAuth implementation
    useAuth.mockReturnValue({
      currentUser: mockCurrentUser,
      logout: jest.fn()
    });

    // Mock fetch implementation
    global.fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob())
      })
    );

    // Mock Firestore query implementation
    const mockQuerySnapshot = {
      docs: mockVoices.map(voice => ({
        id: voice.id,
        data: () => voice
      }))
    };

    // Mock Firestore functions
    const { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc } = require('firebase/firestore');
    collection.mockReturnValue('voices');
    query.mockReturnValue('query');
    where.mockReturnValue('where');
    orderBy.mockReturnValue('orderBy');
    getDocs.mockResolvedValue(mockQuerySnapshot);
    addDoc.mockResolvedValue({ id: 'new-voice-id' });
    deleteDoc.mockResolvedValue();
    doc.mockReturnValue('doc');
  });

  test('renders dashboard with user email', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    
    expect(screen.getByText(mockCurrentUser.email)).toBeInTheDocument();
  });

  test('redirects to home if user is not authenticated', () => {
    useAuth.mockReturnValueOnce({
      currentUser: null
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  // test('handles logout', async () => {
  //   const mockLogout = jest.fn().mockResolvedValue();
  //   useAuth.mockReturnValueOnce({
  //     currentUser: mockCurrentUser,
  //     logout: mockLogout
  //   });

  //   render(
  //     <BrowserRouter>
  //       <Dashboard />
  //     </BrowserRouter>
  //   );

  //   const logoutButton = screen.getByText('Logout');
  //   fireEvent.click(logoutButton);

  //   await waitFor(() => {
  //     expect(mockLogout).toHaveBeenCalled();
  //     expect(mockNavigate).toHaveBeenCalledWith('/');
  //   });
  // });

  test('loads and displays saved voices', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Voice 1')).toBeInTheDocument();
      expect(screen.getByText('Voice 2')).toBeInTheDocument();
    });
  });

  test('selects first voice by default', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      const voiceItem = screen.getByText('Voice 1').closest('.voice-item');
      expect(voiceItem).toHaveClass('selected');
    });
  });

  test('allows voice selection', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Voice 1')).toBeInTheDocument();
    });

    const voice2 = screen.getByText('Voice 2');
    fireEvent.click(voice2);

    const voiceItem = voice2.closest('.voice-item');
    expect(voiceItem).toHaveClass('selected');
  });

  test('generates speech when speak button is clicked', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Wait for voices to load and first voice to be selected
    await waitFor(() => {
      expect(screen.getByText('Voice 1')).toBeInTheDocument();
    });

    // Type some text
    const textarea = screen.getByPlaceholderText('What would you like your voice to say?');
    fireEvent.change(textarea, { target: { value: 'Hello, world!' } });

    // Click speak button
    const speakButton = screen.getByText('Speak');
    fireEvent.click(speakButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tts', expect.any(Object));
    });
  });

  test('displays error message when speech generation fails', async () => {
    // Mock fetch to return an error
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Failed to generate speech' })
      })
    );

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Wait for voices to load and first voice to be selected
    await waitFor(() => {
      expect(screen.getByText('Voice 1')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('What would you like your voice to say?');
    fireEvent.change(textarea, { target: { value: 'Hello, world!' } });

    const speakButton = screen.getByText('Speak');
    fireEvent.click(speakButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to generate speech/i)).toBeInTheDocument();
    });
  });

  test('disables speak button when no text is entered', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const speakButton = screen.getByText('Speak');
    expect(speakButton).toBeDisabled();
  });

  test('disables speak button when no voice is selected', async () => {
    // Mock empty voices list
    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValueOnce({ docs: [] });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const textarea = screen.getByPlaceholderText('What would you like your voice to say?');
    fireEvent.change(textarea, { target: { value: 'Hello, world!' } });

    const speakButton = screen.getByText('Speak');
    expect(speakButton).toBeDisabled();
  });

  test('displays empty state when no voices exist', async () => {
    // Mock empty voices list
    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValueOnce({ docs: [] });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Create your first voice clone/i)).toBeInTheDocument();
    });
  });
}); 