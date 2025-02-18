const fetch = require('node-fetch');
const debug = require('../utils/debug');

const CARTESIA_TTS_URL = 'https://api.cartesia.ai/tts/bytes';
const CARTESIA_API_VERSION = '2024-06-10';

async function generateSpeech(voiceId, text) {
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
    const text = await response.text();
    throw new Error(`TTS generation failed: ${text}`);
  }

  return response.buffer();
}

module.exports = { generateSpeech }; 