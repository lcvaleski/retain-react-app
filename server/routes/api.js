const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { uploadToStorage } = require('../controllers/uploadController');
const { cloneVoice } = require('../controllers/voiceController');
const debug = require('../utils/debug');

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Too many uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/upload', uploadLimiter, upload.single('audio'), async (req, res) => {
  try {
    const { blob, file } = await uploadToStorage(req, res);
    const cloneResult = await cloneVoice(file);
    
    res.status(200).json({
      message: 'Voice uploaded and cloned successfully',
      voiceId: cloneResult.id,
      language: cloneResult.language,
      createdAt: cloneResult.created_at
    });
  } catch (error) {
    debug('Error:', error);
    res.status(500).json({
      message: 'Operation failed',
      details: error.message
    });
  }
});

module.exports = router; 