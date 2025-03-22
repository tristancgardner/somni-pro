import React, { useEffect, useState } from 'react';
import SpeakerTag from './SpeakerTag';

interface FileSpeakersProps {
  fileKey: string;
  downloadUrl: string;
}

interface Speaker {
  name: string;
  role: string;
}

interface SpeakerMap {
  [speakerId: string]: Speaker;
}

const FileSpeakers: React.FC<FileSpeakersProps> = ({ fileKey, downloadUrl }) => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpeakers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First fetch the transcript JSON
        const response = await fetch('/api/fetch-transcript', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ downloadUrl }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch transcript');
        }

        const data = await response.json();
        
        // Check if the transcript has speakerMap data
        if (data.speakerMap) {
          const speakerMap: SpeakerMap = data.speakerMap;
          
          // Extract unique speakers (as some might be duplicated)
          const uniqueSpeakers = new Map<string, Speaker>();
          
          Object.values(speakerMap).forEach((speaker) => {
            if (speaker.name && !uniqueSpeakers.has(speaker.name)) {
              uniqueSpeakers.set(speaker.name, speaker);
            }
          });
          
          setSpeakers(Array.from(uniqueSpeakers.values()));
        } else {
          setSpeakers([]);
        }
      } catch (err) {
        console.error('Error fetching speakers:', err);
        setError('Failed to load speakers');
        setSpeakers([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (downloadUrl) {
      fetchSpeakers();
    }
  }, [downloadUrl]);

  if (isLoading) {
    return <span className="text-xs text-gray-400 italic">Loading speakers...</span>;
  }

  if (error) {
    return null; // Don't show any error, just hide the component
  }

  if (speakers.length === 0) {
    return null; // Don't display anything if no speakers found
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {speakers.map((speaker, index) => (
        <SpeakerTag key={index} name={speaker.name} role={speaker.role} />
      ))}
    </div>
  );
};

export default FileSpeakers; 