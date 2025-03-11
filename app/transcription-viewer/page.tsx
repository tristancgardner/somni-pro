"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Users } from 'lucide-react';

// Define the types based on the transcription data
interface Word {
  word: string;
  start: number;
  end: number;
}

interface Segment {
  segment_id: number;
  speaker: string;
  text: string;
  start: number;
  end: number;
  words: Word[];
  role?: string;
  name?: string;
}

interface TranscriptData {
  file: string;
  transcript: Segment[];
  num_speakers: number;
}

interface SpeakerStats {
  speaker: string;
  name?: string;
  role?: string;
  segments: number;
  words: number;
  totalDuration: number;
}

export default function TranscriptionViewerPage() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  
  const [transcription, setTranscription] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speakerStats, setSpeakerStats] = useState<SpeakerStats[]>([]);

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate speaker statistics
  const calculateSpeakerStats = (data: TranscriptData): SpeakerStats[] => {
    const speakerSegments: Record<string, Segment[]> = {};
    
    data.transcript.forEach(segment => {
      if (!speakerSegments[segment.speaker]) {
        speakerSegments[segment.speaker] = [];
      }
      speakerSegments[segment.speaker].push(segment);
    });
    
    return Object.entries(speakerSegments).map(([speaker, segments]) => {
      const totalDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
      const wordCount = segments.reduce((sum, seg) => sum + (seg.words?.length || 0), 0);
      
      return {
        speaker,
        name: segments[0].name || undefined,
        role: segments[0].role,
        segments: segments.length,
        words: wordCount,
        totalDuration,
      };
    });
  };

  // Fetch the transcription data
  useEffect(() => {
    const fetchTranscription = async () => {
      if (!url) {
        setError('No URL provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch the transcription through the API proxy
        const response = await fetch('/api/fetch-transcription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jsonUrl: url }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        
        const data = await response.json();
        setTranscription(data);
        
        // Calculate speaker statistics
        const stats = calculateSpeakerStats(data);
        setSpeakerStats(stats);
        
      } catch (err) {
        console.error('Error fetching transcription:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transcription');
      } finally {
        setLoading(false);
      }
    };

    fetchTranscription();
  }, [url]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/30 border border-red-600 text-red-400 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <p className="text-gray-400">No transcription data available</p>
      </div>
    );
  }

  const fileDuration = transcription.transcript.length > 0 
    ? transcription.transcript[transcription.transcript.length - 1].end 
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Transcription Results</h1>
        <p className="text-gray-400 mt-1">{transcription.file}</p>
      </div>
      
      {/* File Stats */}
      <div className="bg-black bg-opacity-80 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-400">Duration</div>
              <div className="text-2xl font-bold">{formatDuration(fileDuration)}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-400">Speakers</div>
              <div className="text-2xl font-bold">{transcription.num_speakers}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-400">Segments</div>
              <div className="text-2xl font-bold">{transcription.transcript.length}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Speaker Analysis */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Speaker Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {speakerStats.map((speaker, index) => (
            <div key={index} className="bg-black bg-opacity-80 rounded-lg p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <Badge className="bg-[#45b7aa] text-white mb-2">{speaker.speaker}</Badge>
                  {speaker.name && (
                    <h3 className="text-lg font-semibold">{speaker.name}</h3>
                  )}
                  {speaker.role && (
                    <div className="text-sm text-gray-400">{speaker.role}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Segments</div>
                  <div className="text-sm font-medium">{speaker.segments}</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-400">Words</div>
                  <div className="text-sm font-medium">{speaker.words}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Duration</div>
                  <div className="text-sm font-medium">{formatDuration(speaker.totalDuration)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Transcript Timeline */}
      <div>
        <h2 className="text-xl font-bold mb-4">Transcript Timeline</h2>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {transcription.transcript.map((segment) => (
            <div
              key={segment.segment_id}
              className="p-5 rounded-lg border border-gray-800 bg-black bg-opacity-80"
            >
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-[#45b7aa] text-white">{segment.speaker}</Badge>
                <span className="text-sm text-gray-400">
                  {formatDuration(segment.start)} - {formatDuration(segment.end)}
                </span>
              </div>
              {segment.role && (
                <div className="text-gray-400 text-sm mb-1">Role: {segment.role}</div>
              )}
              {segment.name && (
                <div className="text-gray-400 text-sm mb-2">Name: {segment.name}</div>
              )}
              <p className="text-gray-200">{segment.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 