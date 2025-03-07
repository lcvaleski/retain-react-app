const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { uploadToStorage } = require('../controllers/uploadController');
const { cloneVoice, saveVoice, getVoices } = require('../controllers/voiceController');
const debug = require('../utils/debug');
const { generateSpeech } = require('../controllers/ttsController');

let stripe;
try {
  stripe = require('stripe')(process.env.NODE_ENV === 'production' 
    ? process.env.STRIPE_SECRET_KEY_LIVE 
    : process.env.STRIPE_SECRET_KEY_TEST
  );
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

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

// Updated Stripe checkout endpoint
router.post('/create-checkout', async (req, res) => {
  if (!stripe) {
    console.error('Stripe not initialized');
    return res.status(500).json({ 
      error: 'Stripe is not properly configured'
    });
  }

  try {
    // Get the URL based on environment
    const baseUrl = process.env.CLIENT_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://www.retainvoice.com'
        : 'http://localhost:3000');

    console.log('Creating checkout session with baseUrl:', baseUrl);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '4 Voice Pack',
              description: 'Unlock the ability to create 4 additional voice clones',
            },
            unit_amount: 499, // $4.99
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/dashboard?payment=success`,
      cancel_url: `${baseUrl}/dashboard?payment=cancelled`,
    });

    console.log('Checkout session created:', session.id);
    
    return res.status(200).json({
      url: session.url
    });

  } catch (error) {
    console.error('Stripe session creation error:', error);
    
    return res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Payment session creation failed' 
        : error.message 
    });
  }
});

module.exports = router; 