const FormData = require('form-data');
const fetch = require('node-fetch');
const debug = require('../utils/debug');

const CARTESIA_API_URL = 'https://api.cartesia.ai/voices/clone';
const CARTESIA_API_VERSION = '2024-06-10';

async function cloneVoice(file) {
  const formData = new FormData();
  formData.append('clip', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype
  });
  
  formData.append('name', `Voice Clone ${Date.now()}`);
  formData.append('language', 'en');
  formData.append('mode', 'stability');
  formData.append('enhance', 'true');
  
  const response = await fetch(CARTESIA_API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.CARTESIA_API_KEY,
      'Cartesia-Version': CARTESIA_API_VERSION,
      'Accept': 'application/json'
    },
    body: formData
  });

  const responseText = await response.text();
  let responseData;
  
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Cartesia API error (${response.status}): ${responseText.substring(0, 100)}...`);
  }

  if (!response.ok) {
    throw new Error(responseData.message || 'Voice cloning failed');
  }

  return responseData;
}

module.exports = { cloneVoice }; 