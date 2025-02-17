const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.local';
require('dotenv').config({ path: envPath });

const app = express();

// Add CORS and JSON middleware
app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
  });
  next();
});

// Configure multer for file upload
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// Initialize Google Cloud Storage with explicit credentials
let storage;
let bucket;

if (process.env.GOOGLE_CLOUD_BUCKET_NAME) {
  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentials: {
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }
  });

  bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);
}

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Add production security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

const debug = (...args) => {
  console.log(JSON.stringify(args, null, 2));
};

// Rate limiting middleware
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // limit each IP to 10 uploads per hour
  message: { message: 'Too many uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Add before the upload
const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10GB total storage

async function checkStorageQuota() {
  const [files] = await bucket.getFiles();
  const totalSize = files.reduce((acc, file) => acc + parseInt(file.metadata.size), 0);
  return totalSize < STORAGE_QUOTA_BYTES;
}

app.post('/api/upload', uploadLimiter, upload.single('audio'), async (req, res) => {
  if (!bucket) {
    return res.status(500).json({ message: 'Storage not configured' });
  }
  debug('Received upload request', {
    headers: req.headers,
    fileDetails: {
      exists: !!req.file,
      mimetype: req.file?.mimetype,
      size: req.file?.size
    }
  });
  
  try {
    if (!req.file) {
      debug('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Log GCS configuration
    debug('GCS Config', {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      bucketName: process.env.GOOGLE_CLOUD_BUCKET_NAME,
      hasCredentials: !!process.env.GOOGLE_CLOUD_CREDENTIALS
    });

    // Validate file type
    const allowedTypes = [
      'audio/mpeg',    // MP3 files
      'audio/wav',     // WAV files
      'audio/mp4',     // MP4 audio
      'audio/m4a',     // M4A files (common format for iPhone voice recordings)
      'audio/x-m4a'    // Alternative MIME type for M4A files
    ];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type' });
    }

    // Check storage quota
    const underQuota = await checkStorageQuota();
    if (!underQuota) {
      return res.status(507).json({ message: 'Storage quota exceeded' });
    }

    // Create unique filename
    const filename = `audio-${Date.now()}${path.extname(req.file.originalname)}`;
    const blob = bucket.file(filename);

    // Create write stream
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    // Update error logging
    blobStream.on('error', (error) => {
      debug('Upload error', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ message: 'Upload failed', details: error.message });
    });

    blobStream.on('finish', async () => {
      try {
        debug('Upload finished, generating signed URL');
        const [signedUrl] = await blob.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000,
        });
        debug('Signed URL generated successfully');
        
        res.status(200).json({
          message: 'Upload successful',
          url: signedUrl
        });
      } catch (error) {
        debug('Signed URL error', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        res.status(500).json({ 
          message: 'Failed to generate signed URL',
          details: error.message 
        });
      }
    });

    blobStream.end(req.file.buffer);

  } catch (error) {
    debug('Server error', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Server error',
      details: error.message
    });
  }
});

app.get('/api/firebase-config', (req, res) => {
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
  };
  
  // Add debug logging
  debug('Serving Firebase config:', {
    configPresent: Object.keys(firebaseConfig).filter(key => !!firebaseConfig[key]),
    configMissing: Object.keys(firebaseConfig).filter(key => !firebaseConfig[key])
  });
  
  res.json(firebaseConfig);
});

module.exports = app; 