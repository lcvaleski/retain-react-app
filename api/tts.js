const { generateSpeech } = require('../server/controllers/ttsController');

module.exports = async (req, res) => {
  console.log('TTS Serverless Function Hit:', new Date().toISOString());
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
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
}; 