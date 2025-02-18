const fetch = require('node-fetch');
const debug = require('../utils/debug');

const CARTESIA_TTS_URL = 'https://api.cartesia.ai/tts/bytes';
const CARTESIA_API_VERSION = '2024-06-10';

async function generateSpeech(voiceId, text) {
  // Add debug logging for request details
  debug('TTS Request:', {
    url: CARTESIA_TTS_URL,
    voiceId,
    textLength: text.length,
    apiVersion: CARTESIA_API_VERSION,
    hasApiKey: !!process.env.CARTESIA_API_KEY
  });

  const response = await fetch(CARTESIA_TTS_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.CARTESIA_API_KEY,
      'Cartesia-Version': CARTESIA_API_VERSION,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
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
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    debug('TTS Error Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: errorText
    });
    throw new Error(`TTS generation failed: ${errorText}`);
  }

  return response.buffer();
}

module.exports = { generateSpeech }; 