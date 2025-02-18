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

async function uploadToStorage(req, res) {
  if (!bucket) {
    return res.status(500).json({ message: 'Storage not configured' });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file type
    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/mp4',
      'audio/m4a', 'audio/x-m4a'
    ];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type' });
    }

    const underQuota = await checkStorageQuota();
    if (!underQuota) {
      return res.status(507).json({ message: 'Storage quota exceeded' });
    }

    const filename = `audio-${Date.now()}${path.extname(req.file.originalname)}`;
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: { contentType: req.file.mimetype },
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => reject(error));
      blobStream.on('finish', () => resolve({ blob, file: req.file }));
      blobStream.end(req.file.buffer);
    });

  } catch (error) {
    throw error;
  }
}

module.exports = { uploadToStorage }; 