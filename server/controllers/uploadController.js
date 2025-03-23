const { Storage } = require('@google-cloud/storage');
const path = require('path');
const debug = require('../utils/debug');

// Initialize Google Cloud Storage
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

const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10GB

async function checkStorageQuota() {
  const [files] = await bucket.getFiles();
  const totalSize = files.reduce((acc, file) => acc + parseInt(file.metadata.size), 0);
  return totalSize < STORAGE_QUOTA_BYTES;
}

async function uploadToStorage(req) {
  if (!bucket) {
    throw new Error('Storage not configured');
  }

  if (!req.file) {
    throw new Error('No file provided');
  }

  try {
    // Validate file type
    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/mp4',
      'audio/m4a', 'audio/x-m4a'
    ];
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new Error(`Invalid file type: ${req.file.mimetype}`);
    }

    const underQuota = await checkStorageQuota();
    if (!underQuota) {
      throw new Error('Storage quota exceeded');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const filename = `audio-${timestamp}-${randomString}${path.extname(req.file.originalname)}`;
    
    const blob = bucket.file(filename);
    
    // Upload with explicit content type and metadata
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: { 
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname,
          timestamp: timestamp.toString(),
          userId: req.body.userId || 'anonymous'
        }
      }
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('Blob stream error:', error);
        reject(new Error('Failed to upload file: ' + error.message));
      });

      blobStream.on('finish', () => {
        resolve({ 
          blob, 
          file: req.file,
          path: filename
        });
      });

      // Handle the upload
      try {
        blobStream.end(req.file.buffer);
      } catch (error) {
        console.error('Buffer write error:', error);
        reject(new Error('Failed to process file buffer'));
      }
    });

  } catch (error) {
    console.error('Upload to storage error:', {
      error: error.message,
      stack: error.stack,
      file: req.file ? {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      } : null
    });
    throw error;
  }
}

module.exports = { uploadToStorage }; 