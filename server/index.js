const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

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

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: process.env.GOOGLE_CLOUD_CREDENTIALS 
    ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
    : { keyFilename: process.env.GOOGLE_CLOUD_KEY_PATH }
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);

// Add this near the top after middleware setup
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

// Add this at the top of the file
const debug = (...args) => {
  console.log(JSON.stringify(args, null, 2));
};

app.post('/api/upload', upload.single('audio'), async (req, res) => {
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
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type' });
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

app.get('/api/test', (req, res) => {
  debug('Test endpoint hit', { time: new Date().toISOString() });
  res.json({ message: 'Test successful' });
});

// Remove the app.listen() call and export the app
module.exports = app; 