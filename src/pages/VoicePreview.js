import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

function VoicePreview() {
  const { voiceId } = useParams();
  const [voice, setVoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVoice = async () => {
      try {
        const voiceDoc = await getDoc(doc(db, 'voices', voiceId));
        if (voiceDoc.exists()) {
          setVoice(voiceDoc.data());
        } else {
          setError('Voice not found');
        }
      } catch (err) {
        setError('Failed to load voice');
      } finally {
        setLoading(false);
      }
    };

    fetchVoice();
  }, [voiceId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="voice-preview">
      <h1>{voice.name}</h1>
      {/* Add preview functionality */}
    </div>
  );
}

export default VoicePreview; 