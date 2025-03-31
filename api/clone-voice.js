export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    maxDuration: 60, // Voice cloning might take longer
  },
};

const CARTESIA_API_URL = 'https://api.cartesia.ai/voices/clone';
const CARTESIA_API_VERSION = '2024-06-10';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioBuffer, fileName, mimeType } = req.body;

    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(audioBuffer, 'base64');

    // Create form data
    const formData = new FormData();
    formData.append('clip', new Blob([buffer]), {
      filename: fileName || `voice_${Date.now()}.wav`,
      contentType: mimeType || 'audio/wav'
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

    // Make sure we have a voice ID before sending response
    if (!responseData.id) {
      throw new Error('No voice ID returned from Cartesia API');
    }

    // Return a consistent structure
    res.status(200).json({
      success: true,
      voiceId: responseData.id, // Ensure voiceId is explicitly set
      name: responseData.name,
      language: responseData.language,
      createdAt: new Date().toISOString(),
      ...responseData // Include any other fields from Cartesia
    });

  } catch (error) {
    console.error('Voice cloning error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Voice cloning failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
} 