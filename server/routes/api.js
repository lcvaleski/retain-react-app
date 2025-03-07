const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { uploadToStorage } = require('../controllers/uploadController');
const { cloneVoice, saveVoice, getVoices } = require('../controllers/voiceController');
const stripeHandler = require('../../api/stripe');
const stripeWebhookHandler = require('../../api/stripe-webhook');
const debug = require('../utils/debug');
const { generateSpeech } = require('../controllers/ttsController');

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
    const { file } = await uploadToStorage(req, res);
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

router.post('/tts', async (req, res) => {
  console.log('TTS endpoint hit at:', new Date().toISOString());
  
  try {
    const { voiceId, text } = req.body;
    console.log('Request payload:', { voiceId, text: text?.substring(0, 20) + '...' });
    
    if (!voiceId || !text) {
      console.log('Missing required fields:', { voiceId, hasText: !!text });
      return res.status(400).json({
        message: 'Missing required fields',
        details: 'Both voiceId and text are required'
      });
    }

    console.log('Calling Cartesia API with voiceId:', voiceId);
    const audioBuffer = await generateSpeech(voiceId, text);
    console.log('Received audio buffer of size:', audioBuffer.length);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    
    res.send(audioBuffer);
    
  } catch (error) {
    console.error('TTS Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      message: 'TTS generation failed',
      details: error.message
    });
  }
});

router.post('/voices', async (req, res) => {
  try {
    const { userId, voiceId, name } = req.body;
    if (!userId || !voiceId || !name) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const voice = await saveVoice(userId, voiceId, name);
    res.json(voice);
  } catch (error) {
    console.error('Save voice error:', error);
    res.status(500).json({ message: 'Failed to save voice' });
  }
});

router.get('/voices/:userId', async (req, res) => {
  try {
    const voices = await getVoices(req.params.userId);
    res.json(voices);
  } catch (error) {
    console.error('Get voices error:', error);
    res.status(500).json({ message: 'Failed to fetch voices' });
  }
});

// Stripe routes
router.post('/stripe', stripeHandler);

// Stripe webhook needs raw body for signature verification
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

module.exports = router; 