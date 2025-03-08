"use client";

import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiUser } from 'react-icons/fi';

// Transcription data types
interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
}

interface TranscriptionSegment {
  segment_id: number;
  speaker: string;
  text: string;
  start: number;
  end: number;
  words: TranscriptionWord[];
}

interface TranscriptionData {
  file: string;
  transcript: TranscriptionSegment[];
  num_speakers: number;
}

interface TranscriptionViewerProps {
  jsonUrl: string;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getSpeakerColor = (speaker: string): string => {
  // Generate consistent colors based on speaker ID
  const speakerNum = parseInt(speaker.replace('SPEAKER_', ''), 10);
  const colors = [
    'rgb(59, 130, 246)', // blue
    'rgb(16, 185, 129)', // green
    'rgb(239, 68, 68)',  // red
    'rgb(245, 158, 11)', // amber
    'rgb(139, 92, 246)', // purple
    'rgb(236, 72, 153)', // pink
  ];
  return colors[speakerNum % colors.length];
};

export default function TranscriptionViewer({ jsonUrl }: TranscriptionViewerProps) {
  const [transcription, setTranscription] = useState<TranscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<number[]>([]);

  useEffect(() => {
    const fetchTranscription = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use our proxy API endpoint instead of direct fetch
        const response = await fetch('/api/fetch-transcription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jsonUrl }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // If the data is missing expected properties, try to handle it gracefully
        if (!data.file || !Array.isArray(data.transcript)) {
          console.warn('Unexpected transcription format:', data);
          
          // Try to infer file name from URL if missing
          if (!data.file) {
            const urlParts = jsonUrl.split('/');
            const fileName = urlParts[urlParts.length - 1].split('.')[0];
            data.file = fileName;
          }
          
          // Ensure transcript is an array
          if (!Array.isArray(data.transcript)) {
            data.transcript = [];
          }
          
          // Ensure num_speakers exists
          if (typeof data.num_speakers !== 'number') {
            // Try to infer from transcript
            const speakerSet = new Set();
            (data.transcript || []).forEach((segment: TranscriptionSegment) => {
              if (segment.speaker) {
                speakerSet.add(segment.speaker);
              }
            });
            data.num_speakers = speakerSet.size || 0;
          }
        }
        
        setTranscription(data);
      } catch (err) {
        console.error('Error loading transcription:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transcription');
      } finally {
        setLoading(false);
      }
    };

    if (jsonUrl) {
      fetchTranscription();
    }
  }, [jsonUrl]);

  const toggleSegment = (segmentId: number) => {
    setExpandedSegments(prev => 
      prev.includes(segmentId) 
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
        <span className="ml-3">Loading transcription...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 text-red-700 p-4 rounded">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400">No transcription data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-w-3xl mx-auto">
      <div className="mb-4 pb-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold mb-1">{transcription.file}</h2>
        <div className="flex items-center text-gray-400">
          <FiUser className="mr-2" />
          <span>{transcription.num_speakers} speaker{transcription.num_speakers !== 1 ? 's' : ''} detected</span>
        </div>
      </div>

      <div className="space-y-3">
        {transcription.transcript.map((segment) => {
          const isExpanded = expandedSegments.includes(segment.segment_id);
          const speakerColor = getSpeakerColor(segment.speaker);
          
          return (
            <div 
              key={segment.segment_id} 
              className="bg-gray-900 rounded-md overflow-hidden"
            >
              <div 
                className="flex items-center p-3 cursor-pointer hover:bg-gray-700/30"
                onClick={() => toggleSegment(segment.segment_id)}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0"
                  style={{ backgroundColor: speakerColor }}
                >
                  <span className="text-white text-xs font-medium">
                    {segment.speaker.replace('SPEAKER_', 'S')}
                  </span>
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {segment.speaker.replace('SPEAKER_', 'Speaker ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(segment.start)} - {formatTime(segment.end)}
                    </span>
                  </div>
                  
                  {!isExpanded && (
                    <p className="text-sm text-gray-400 line-clamp-1">
                      {segment.text}
                    </p>
                  )}
                </div>
                
                <div className="ml-3 text-gray-400">
                  {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-5 pb-4 pt-1">
                  <div className="pl-11 -mt-1">
                    <p className="text-gray-300">{segment.text}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {transcription.transcript.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No transcription segments found
        </div>
      )}
    </div>
  );
} 