import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll use formidable
    maxDuration: 30, // This function might take a while
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: (part) => part.mimetype?.startsWith('audio/'), // Only accept audio files
    });

    // Parse the form
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const audioFile = files.audio?.[0];
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Read the file
    const fileBuffer = await fs.readFile(audioFile.filepath);

    // Call the clone-voice endpoint
    const cloneResponse = await fetch(`${process.env.CLIENT_URL}/api/clone-voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioBuffer: fileBuffer.toString('base64'),
        fileName: audioFile.originalFilename,
        mimeType: audioFile.mimetype
      })
    });

    if (!cloneResponse.ok) {
      throw new Error('Voice cloning failed');
    }

    const cloneData = await cloneResponse.json();
    
    // Log the response for debugging
    console.log('Clone response:', cloneData);

    // Verify we have a voiceId before sending response
    if (!cloneData.voiceId) {
      throw new Error('No voice ID in clone response');
    }

    res.status(200).json({
      success: true,
      voiceId: cloneData.voiceId, // Make sure this is explicitly set
      message: 'Voice cloned successfully',
      size: audioFile.size,
      type: audioFile.mimetype,
      ...cloneData // Include other relevant data
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
} 