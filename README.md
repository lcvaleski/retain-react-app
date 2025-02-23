# Retain - Voice Cloning & Text-to-Speech App

Retain is a web application that lets users clone their voice and generate speech from text using their cloned voice. Built with React, Firebase, and the Cartesia AI API.

## Features

- Voice cloning from audio recordings
- Text-to-speech using cloned voices
- User authentication (Google, Email/Password)
- Anonymous voice cloning with account linking
- Voice management (save, name, and reuse voices)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- Cartesia AI API key

## Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/retain-react-app.git
cd retain-react-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Authentication (Google & Email/Password)
   - Create a Firestore database

4. Set up environment variables:
   - Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
   - Fill in your Firebase and Cartesia API credentials:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
CARTESIA_API_KEY=your_cartesia_api_key
```

5. Set up Firestore security rules:
   - Copy `firestore.rules.example` to `firestore.rules`
   - Modify the rules according to your security needs

6. Start the development server:
```bash
npm start
```

## Project Structure

```
retain-react-app/
├── src/
│   ├── components/         # React components
│   ├── contexts/          # Context providers (Auth, etc.)
│   ├── assets/           # Images and static assets
│   └── App.js            # Main application component
├── server/
│   ├── controllers/      # API controllers
│   └── models/          # Database models
├── api/                 # Serverless functions
└── public/             # Static files
```

## Testing

Run the test suite:
```bash
npm test
```

## Deployment

1. Build the production version:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

## API Integration

The app uses the Cartesia AI API for voice cloning and text-to-speech. Key endpoints:

- `/voices/clone` - Clone a voice from audio
- `/tts` - Generate speech from text using a cloned voice

## Troubleshooting

Common issues:

- **Firebase initialization error**: Check your Firebase credentials in `.env.local`
- **Voice cloning fails**: Verify your Cartesia API key and audio file format
- **Authentication issues**: Ensure Firebase Authentication is properly configured

## License

MIT License

## Contact

For questions or support, please open an issue on GitHub.