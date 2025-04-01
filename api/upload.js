import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false, // Important for file uploads
    maxDuration: 30, // This function might take a while
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
      filter: (part) => part.mimetype?.startsWith('audio/'),
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
    const base64Audio = fileBuffer.toString('base64');

    // Call the clone-voice endpoint
    const cloneResponse = await fetch(`${process.env.CLIENT_URL}/api/clone-voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioBuffer: base64Audio,
        fileName: audioFile.originalFilename,
        mimeType: audioFile.mimetype
      })
    });

    if (!cloneResponse.ok) {
      const errorText = await cloneResponse.text();
      console.error('Clone voice error:', errorText);
      throw new Error(`Voice cloning failed: ${errorText}`);
    }

    const cloneData = await cloneResponse.json();

    res.status(200).json({
      success: true,
      ...cloneData
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  } finally {
    // Clean up any temporary files
    if (req.files) {
      for (const file of Object.values(req.files)) {
        try {
          await fs.unlink(file.filepath);
        } catch (error) {
          console.error('Error cleaning up file:', error);
        }
      }
    }
  }
} 