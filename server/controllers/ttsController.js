const fetch = require('node-fetch');
const debug = require('../utils/debug');

const CARTESIA_TTS_URL = 'https://api.cartesia.ai/tts/bytes';
const CARTESIA_API_VERSION = '2024-06-10';

async function generateSpeech(voiceId, text) {
  // Add more detailed debug logging
  debug('TTS Request Starting:', {
    url: CARTESIA_TTS_URL,
    voiceId,
    textLength: text.length,
    apiVersion: CARTESIA_API_VERSION,
    hasApiKey: !!process.env.CARTESIA_API_KEY,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  try {
    const requestBody = {
      model_id: 'sonic-english',
      transcript: text,
      voice: {
        mode: 'id',
        id: voiceId
      },
      output_format: {
        container: 'mp3',
        bit_rate: 128000,
        sample_rate: 44100
      },
      language: 'en'
    };

    debug('TTS Request Body:', requestBody);

    const response = await fetch(CARTESIA_TTS_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.CARTESIA_API_KEY,
        'Cartesia-Version': CARTESIA_API_VERSION,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(requestBody)
    });

    debug('TTS Response Status:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      debug('TTS Error Response Body:', errorText);
      
      // Try to parse error as JSON if possible
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || errorJson.error || 'TTS generation failed');
      } catch (e) {
        throw new Error(`TTS generation failed: ${errorText}`);
      }
    }

    const buffer = await response.buffer();
    debug('TTS Success:', {
      bufferLength: buffer.length,
      timestamp: new Date().toISOString()
    });

    return buffer;
  } catch (error) {
    debug('TTS Fatal Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

module.exports = { generateSpeech }; 