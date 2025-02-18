const fetch = require('node-fetch');

const CARTESIA_TTS_URL = 'https://api.cartesia.ai/tts/bytes';
const CARTESIA_API_VERSION = '2024-06-10';

async function generateSpeech(voiceId, text) {
  console.log('Starting TTS request:', {
    url: CARTESIA_TTS_URL,
    voiceId,
    textLength: text.length,
    hasApiKey: !!process.env.CARTESIA_API_KEY
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

    console.log('Making request to Cartesia API');
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

    console.log('Received response:', {
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cartesia API error:', {
        status: response.status,
        error: errorText
      });
      throw new Error(`TTS generation failed: ${errorText}`);
    }

    const buffer = await response.buffer();
    console.log('Successfully received audio buffer of size:', buffer.length);
    return buffer;
    
  } catch (error) {
    console.error('Fatal TTS error:', error);
    throw error;
  }
}

module.exports = { generateSpeech }; 