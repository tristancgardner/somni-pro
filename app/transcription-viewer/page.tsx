"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Users, ArrowLeft, Save, ChevronRight, ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

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
  summaryJson?: {
    [key: string]: {
      summary: string;
      themes?: string[];
      key_moments?: string[];
    }
  };
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
  const router = useRouter();
  const url = searchParams.get('url');
  const projectId = searchParams.get('projectId');
  const fileKeysParam = searchParams.get('fileKeys');
  
  // Parse file keys if provided
  const [fileKeys, setFileKeys] = useState<string[]>([]);
  const [projectFiles, setProjectFiles] = useState<{ key: string, filename: string, downloadUrl: string }[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  
  const [transcription, setTranscription] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speakerStats, setSpeakerStats] = useState<SpeakerStats[]>([]);
  
  // State for tracking save operation
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  // State for editing speaker info
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editedSpeakers, setEditedSpeakers] = useState<Record<string, { name?: string, role?: string }>>({});
  
  // Add new state for segment navigation
  const [speakerCurrentSegments, setSpeakerCurrentSegments] = useState<Record<string, number>>({});
  const timelineRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Record<number, HTMLDivElement>>({});
  
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
        name: segments[0].name,
        role: segments[0].role,
        segments: segments.length,
        words: wordCount,
        totalDuration,
      };
    });
  };

  // Add useEffect to check for temporary transcript data
  useEffect(() => {
    const checkForTempTranscript = async () => {
      if (typeof window === 'undefined') return;
      
      const tempId = searchParams.get('tempId');
      if (!tempId) return;
      
      try {
        console.log("Checking for temporary transcript with ID:", tempId);
        const tempDataStr = localStorage.getItem(tempId);
        if (!tempDataStr) {
          console.log('No temporary transcript data found with ID:', tempId);
          return;
        }
        
        console.log("Found temporary data in localStorage");
        const tempData = JSON.parse(tempDataStr);
        
        if (tempData.transcript) {
          // Log the first segment to verify labels are present
          console.log("First segment in temp transcript:", tempData.transcript.transcript[0]);
          
          // Skip the normal fetch since we have data already
          setLoading(false);
          
          // Clear any previous error
          setError(null);
          
          // Set the transcription state with the temporary transcript
          setTranscription(tempData.transcript);
          
          // Calculate speaker statistics for the temp transcript
          const stats = calculateSpeakerStats(tempData.transcript);
          setSpeakerStats(stats);
          
          // Store speaker labels for potential editing
          if (tempData.speakerLabels) {
            const initialEdits: Record<string, { name?: string, role?: string }> = {};
            Object.entries(tempData.speakerLabels).forEach(([speaker, info]) => {
              initialEdits[speaker] = { 
                name: (info as any).name, 
                role: (info as any).role 
              };
            });
            setEditedSpeakers(initialEdits);
          }
          
          // Show a notice that this is a preview
          toast.success('Viewing transcript with temporary speaker labels applied. Save to make permanent.');
        }
        
        // Clean up the temporary data after it's been used
        // Uncomment this if you want it to be one-time use only
        // localStorage.removeItem(tempId);
      } catch (error) {
        console.error('Error parsing temporary transcript data:', error);
        toast.error('Failed to load transcript preview');
      }
    };
    
    checkForTempTranscript();
  }, [searchParams]);

  // Enhance updateSpeakerInfo to handle the preview scenario
  const updateSpeakerInfo = (speakerId: string, name?: string, role?: string) => {
    if (!transcription) return;
    
    // Update edited speakers record
    setEditedSpeakers(prev => ({
      ...prev,
      [speakerId]: { name, role }
    }));
    
    // Check for existing speakers with the same name and role
    const speakersWithSameInfo: string[] = [];
    
    if (name && role) {
      transcription.transcript.forEach(segment => {
        if (segment.speaker !== speakerId && 
            segment.name === name && 
            segment.role === role) {
          if (!speakersWithSameInfo.includes(segment.speaker)) {
            speakersWithSameInfo.push(segment.speaker);
          }
        }
      });
    }
    
    console.log(`Found ${speakersWithSameInfo.length} other speakers with name=${name} and role=${role}`);
    
    // Apply edits to transcription data
    const updatedTranscript = {
      ...transcription,
      transcript: transcription.transcript.map(segment => {
        // Update the current speaker
        if (segment.speaker === speakerId) {
          return {
            ...segment,
            name: name,
            role: role
          };
        }
        
        // If we want to combine speakers with the same info, we can update other segments too
        // This will make all segments from matching speakers use the first speaker's ID
        if (speakersWithSameInfo.includes(segment.speaker)) {
          return {
            ...segment,
            speaker: speakerId,  // Consolidate to use the current speaker ID
            name: name,
            role: role
          };
        }
        
        return segment;
      })
    };
    
    setTranscription(updatedTranscript);
    
    // Update speaker stats
    const stats = calculateSpeakerStats(updatedTranscript);
    setSpeakerStats(stats);
    
    // Exit edit mode
    setEditingSpeaker(null);
    
    // If this was opened from the identify-speakers agent, update the temp storage
    const tempId = searchParams.get('tempId');
    if (tempId) {
      try {
        const tempDataStr = localStorage.getItem(tempId);
        if (tempDataStr) {
          const tempData = JSON.parse(tempDataStr);
          tempData.speakerLabels = tempData.speakerLabels || {};
          tempData.speakerLabels[speakerId] = { name, role };
          
          // If we consolidated speakers, remove the other speakers from the labels
          if (speakersWithSameInfo.length > 0) {
            speakersWithSameInfo.forEach(otherSpeakerId => {
              delete tempData.speakerLabels[otherSpeakerId];
            });
          }
          
          localStorage.setItem(tempId, JSON.stringify(tempData));
        }
      } catch (error) {
        console.error('Error updating temporary transcript data:', error);
      }
    }
  };

  // Function to save updated transcription back to S3
  const saveTranscription = async () => {
    if (!transcription) return;
    
    // Determine which URL to use for saving
    const sourceUrl = url || projectFiles[activeFileIndex]?.downloadUrl;
    if (!sourceUrl) {
      setSaveSuccess(false);
      setSaveMessage('No source URL available for saving');
      return;
    }
    
    try {
      setIsSaving(true);
      setSaveSuccess(null);
      setSaveMessage(null);
      
      // Group speakers with the same name and role 
      const speakerGroups: Record<string, string[]> = {};
      const uniqueLabels: Record<string, { name?: string, role?: string }> = {};
      
      // First pass: gather all unique name+role combinations
      transcription.transcript.forEach(segment => {
        if (segment.name && segment.role) {
          const groupKey = `${segment.name}|${segment.role}`;
          
          if (!speakerGroups[groupKey]) {
            speakerGroups[groupKey] = [];
            uniqueLabels[groupKey] = { 
              name: segment.name, 
              role: segment.role 
            };
          }
          
          if (!speakerGroups[groupKey].includes(segment.speaker)) {
            speakerGroups[groupKey].push(segment.speaker);
          }
        }
      });
      
      console.log("Speaker groups identified:", speakerGroups);
      
      // Create a mapping of original speakerIds to their primary speakerId
      const speakerIdMap: Record<string, string> = {};
      Object.entries(speakerGroups).forEach(([groupKey, speakerIds]) => {
        // Use the first speaker ID as the primary ID for this group
        const primarySpeakerId = speakerIds[0];
        
        // Map all speakers in this group to the primary ID
        speakerIds.forEach(id => {
          speakerIdMap[id] = primarySpeakerId;
        });
      });
      
      console.log("Speaker ID mapping:", speakerIdMap);
      
      // Apply the mapping to consolidate speakers
      const consolidatedTranscript = {
        ...transcription,
        transcript: transcription.transcript.map(segment => {
          // If this speaker is part of a group, replace with the primary ID
          if (segment.name && segment.role && speakerIdMap[segment.speaker]) {
            return {
              ...segment,
              speaker: speakerIdMap[segment.speaker]
            };
          }
          return segment;
        })
      };
      
      // Recalculate speaker stats with the consolidated transcript
      const updatedStats = calculateSpeakerStats(consolidatedTranscript);
      setSpeakerStats(updatedStats);
      
      const response = await fetch('/api/save-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionData: consolidatedTranscript,
          jsonUrl: sourceUrl,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSaveSuccess(true);
        setSaveMessage('Transcription saved successfully');
        // Update the local transcription state with the consolidated version
        setTranscription(consolidatedTranscript);
      } else {
        setSaveSuccess(false);
        setSaveMessage(`Error: ${result.message || 'Failed to save'}`);
      }
      
    } catch (err) {
      console.error('Error saving transcription:', err);
      setSaveSuccess(false);
      setSaveMessage('Failed to save transcription');
    } finally {
      setIsSaving(false);
      
      // Auto-hide success message after 3 seconds
      if (saveSuccess) {
        setTimeout(() => {
          setSaveMessage(null);
        }, 3000);
      }
    }
  };

  // Function to change the active file
  const changeActiveFile = (index: number) => {
    if (index >= 0 && index < projectFiles.length) {
      setActiveFileIndex(index);
      setLoading(true);
      setError(null);
      
      // Save current edits before switching if needed
      if (transcription && Object.keys(editedSpeakers).length > 0) {
        // Optional: prompt user to save changes or auto-save
        // For simplicity, we'll just switch without saving
      }
      
      // Reset states for the new file
      setEditedSpeakers({});
      setEditingSpeaker(null);
      setSaveSuccess(null);
      setSaveMessage(null);
    }
  };

  // Load project files
  useEffect(() => {
    const loadProjectFiles = async () => {
      if (!projectId || !fileKeysParam) return;
      
      try {
        console.log('Loading project files with params:', { projectId, fileKeysParam });
        
        // Parse file keys from URL parameter
        const parsedFileKeys = JSON.parse(decodeURIComponent(fileKeysParam)) as string[];
        setFileKeys(parsedFileKeys);
        
        console.log(`Parsed ${parsedFileKeys.length} file keys from URL`);
        
        // Handle potential @ symbol encoding issues
        const processedFileKeys = parsedFileKeys.map(key => key.replace(/(\$40|%40)/g, '@'));
        
        console.log('Processing file keys to handle @ symbols:', processedFileKeys);
        
        // Fetch file data for each key - this should match the API route exactly
        const apiUrl = `/api/projects/${projectId}/files?keys=${encodeURIComponent(JSON.stringify(processedFileKeys))}`;
        console.log('Fetching from URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error('API response error:', response.status, response.statusText);
          const errorData = await response.json().catch(() => ({}));
          console.error('Error details:', errorData);
          throw new Error(`Failed to load project files: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Successfully loaded project files:', data);
        
        if (!data.files || !Array.isArray(data.files) || data.files.length === 0) {
          console.warn('No files returned from API');
          setError('No files found in this project');
          setLoading(false);
          return;
        }
        
        setProjectFiles(data.files);
        setProjectName(data.projectName);
        
        // Initialize with the first file if available
        if (data.files.length > 0) {
          setActiveFileIndex(0);
          console.log('Set active file to index 0:', data.files[0].filename);
        }
      } catch (error) {
        console.error('Error loading project files:', error);
        setError(`Failed to load project files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    if (projectId && fileKeysParam) {
      loadProjectFiles();
    }
  }, [projectId, fileKeysParam]);

  // Load a single transcription from URL param
  useEffect(() => {
    const fetchTranscription = async () => {
      // Skip if we're using a temporary transcript
      if (searchParams.get('tempId')) {
        console.log("Skipping regular fetch because we're using a temporary transcript");
        return;
      }
      
      if (!url && !(projectFiles.length > 0 && activeFileIndex >= 0)) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Determine the source URL to fetch
        const sourceUrl = url || projectFiles[activeFileIndex]?.downloadUrl;
        
        if (!sourceUrl) {
          throw new Error('No transcription URL available');
        }
        
        // IMPORTANT: Use our API proxy to avoid CORS issues with S3
        const response = await fetch('/api/fetch-transcription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jsonUrl: sourceUrl }),
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
  }, [url, activeFileIndex, projectFiles, searchParams]);

  // If we're in project view (with multiple files)
  const isProjectView = projectId !== null && projectFiles.length > 0;

  // Add back button handler
  const handleBack = () => {
    if (projectId) {
      // If we have a project ID, go back to that specific project view
      router.push(`/file-viewer?projectId=${projectId}`);
    } else {
      // Otherwise just go to the file viewer
      router.push('/file-viewer');
    }
  };

  // After saveTranscription function, add new function to return to the agent
  const returnToIdentifySpeakersAgent = () => {
    // Get the temp ID
    const tempId = searchParams.get('tempId');
    if (!tempId) return;
    
    const sourceUrl = url || projectFiles[activeFileIndex]?.downloadUrl;
    if (!sourceUrl) return;
    
    // Go back to the file viewer with parameters to reopen the agent
    window.close(); // Close this tab/window
    window.opener?.postMessage({ 
      type: 'RETURN_TO_IDENTIFY_SPEAKERS', 
      tempId, 
      sourceUrl,
      edits: editedSpeakers  
    }, window.location.origin);
  };

  // Function to scroll to a specific segment
  const scrollToSegment = (segmentId: number) => {
    if (segmentRefs.current[segmentId] && timelineRef.current) {
      segmentRefs.current[segmentId].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };
  
  // Function to navigate to the next segment for a speaker
  const navigateToNextSegment = (speakerId: string) => {
    if (!transcription) return;
    
    // Get all segments for this speaker
    const speakerSegments = transcription.transcript
      .filter(segment => segment.speaker === speakerId)
      .sort((a, b) => a.start - b.start);
    
    if (speakerSegments.length === 0) return;
    
    // Get current index and calculate next index (with wrap-around)
    const currentIndex = speakerCurrentSegments[speakerId] || 0;
    const nextIndex = (currentIndex + 1) % speakerSegments.length;
    
    // Update the current index for this speaker
    setSpeakerCurrentSegments(prev => ({
      ...prev,
      [speakerId]: nextIndex
    }));
    
    // Scroll to the segment
    scrollToSegment(speakerSegments[nextIndex].segment_id);
  };
  
  // Function to navigate to the previous segment for a speaker
  const navigateToPrevSegment = (speakerId: string) => {
    if (!transcription) return;
    
    // Get all segments for this speaker
    const speakerSegments = transcription.transcript
      .filter(segment => segment.speaker === speakerId)
      .sort((a, b) => a.start - b.start);
    
    if (speakerSegments.length === 0) return;
    
    // Get current index and calculate previous index (with wrap-around)
    const currentIndex = speakerCurrentSegments[speakerId] || 0;
    const prevIndex = (currentIndex - 1 + speakerSegments.length) % speakerSegments.length;
    
    // Update the current index for this speaker
    setSpeakerCurrentSegments(prev => ({
      ...prev,
      [speakerId]: prevIndex
    }));
    
    // Scroll to the segment
    scrollToSegment(speakerSegments[prevIndex].segment_id);
  };

  // Update speakerStats to include segments when transcription changes
  useEffect(() => {
    if (transcription) {
      // Initialize the current segment index for each speaker to 0
      const initialSpeakerSegments: Record<string, number> = {};
      const speakerStats = calculateSpeakerStats(transcription);
      
      speakerStats.forEach(speaker => {
        initialSpeakerSegments[speaker.speaker] = 0;
      });
      
      setSpeakerCurrentSegments(initialSpeakerSegments);
    }
  }, [transcription]);

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
    <div className="flex flex-col h-screen">
      {/* Navigation header */}
      <div className="bg-black/80 p-4 border-b border-gray-800 flex justify-between items-center">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} /> Back to Files
        </button>
        {projectName && (
          <div className="text-lg font-semibold">
            Project: {projectName} 
            {isProjectView && (
              <span className="ml-2 text-sm text-gray-400">
                ({activeFileIndex + 1} of {projectFiles.length} files)
              </span>
            )}
          </div>
        )}
        <div>
          {isProjectView && (
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="bg-gray-800 hover:bg-gray-700 p-2 rounded text-sm"
            >
              {showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* File sidebar (only shown in project view) */}
        {isProjectView && showSidebar && (
          <div className="w-64 bg-black/70 border-r border-gray-800 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-800 text-sm font-medium">
              Files ({projectFiles.length})
            </div>
            <div className="flex-1 overflow-y-auto">
              {projectFiles.map((file, index) => (
                <div 
                  key={file.key}
                  onClick={() => changeActiveFile(index)}
                  className={`p-3 flex items-center gap-2 cursor-pointer hover:bg-black/50 ${
                    index === activeFileIndex ? 'bg-blue-900/30 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <FileText size={16} className="text-gray-400" />
                  <div className="truncate text-sm">
                    {file.filename}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Navigation buttons */}
            {projectFiles.length > 1 && (
              <div className="p-3 border-t border-gray-800 flex justify-between">
                <button
                  onClick={() => changeActiveFile(activeFileIndex - 1)}
                  disabled={activeFileIndex === 0}
                  className={`p-2 rounded ${
                    activeFileIndex === 0 
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-sm flex items-center">
                  {activeFileIndex + 1} / {projectFiles.length}
                </div>
                <button
                  onClick={() => changeActiveFile(activeFileIndex + 1)}
                  disabled={activeFileIndex === projectFiles.length - 1}
                  className={`p-2 rounded ${
                    activeFileIndex === projectFiles.length - 1
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Main content with transcription */}
        <div className={`flex-1 p-6 overflow-y-auto ${isProjectView && showSidebar ? 'ml-0' : ''}`}>
          {/* Add notification banner when viewing a temporary transcript */}
          {searchParams.get('tempId') && (
            <div className="mb-4 bg-indigo-900/30 border border-indigo-500 text-indigo-300 p-4 rounded-lg flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Preview Mode with Speaker Labels</p>
                <p className="text-sm">You're viewing the transcript with temporarily applied speaker labels. These changes won't be permanent until you save them.</p>
              </div>
            </div>
          )}
          
          {/* Add notification when summary is available */}
          {transcription.summaryJson && (
            <div className="mb-4 bg-green-900/30 border border-green-500 text-green-300 p-4 rounded-lg flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Summary Available</p>
                <p className="text-sm">This transcript includes an AI-generated summary with key moments and themes. Scroll down to view it.</p>
              </div>
            </div>
          )}
          
          {/* Existing transcription content */}
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Transcription Results</h1>
              <p className="text-gray-400 mt-1">
                {transcription ? transcription.file : (projectFiles[activeFileIndex]?.filename || '')}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {saveMessage && (
                <div className={`text-sm px-3 py-1 rounded ${saveSuccess ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                  {saveMessage}
                </div>
              )}
              
              <button 
                onClick={saveTranscription}
                disabled={isSaving}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>

              {/* Add Return to Agent button if we're in agent workflow */}
              {searchParams.get('tempId') && (
                <button
                  onClick={returnToIdentifySpeakersAgent}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded mr-3 flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Return to Speaker Identification
                </button>
              )}
            </div>
          </div>
          
          {/* Loading, error, and content states */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-900/30 border border-red-600 text-red-400 rounded-lg">
              <h2 className="text-xl font-bold mb-2">Error</h2>
              <p>{error}</p>
            </div>
          ) : !transcription ? (
            <div className="p-6 bg-gray-800 rounded-lg">
              <p className="text-gray-400">No transcription data available</p>
            </div>
          ) : (
            <>
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
                  {speakerStats.map((speaker, index) => {
                    // Get the current segment index and total segments
                    const currentIndex = speakerCurrentSegments[speaker.speaker] || 0;
                    const totalSegments = speaker.segments;
                    
                    return (
                      <div key={index} className="bg-black bg-opacity-80 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className="bg-teal-800/30 text-teal-300 border-teal-800 hover:bg-teal-800/50"
                              >
                                {speaker.name || speaker.speaker}
                              </Badge>
                              <button 
                                onClick={() => setEditingSpeaker(editingSpeaker === speaker.speaker ? null : speaker.speaker)}
                                className="text-xs text-gray-400 hover:text-white"
                              >
                                {editingSpeaker === speaker.speaker ? 'Cancel' : 'Edit'}
                              </button>
                            </div>
                            
                            {editingSpeaker === speaker.speaker ? (
                              <div className="space-y-2 mt-2">
                                <div>
                                  <label className="text-xs text-gray-400 block">Name:</label>
                                  <input 
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                                    defaultValue={speaker.name || ''}
                                    placeholder="Enter name"
                                    onChange={(e) => {
                                      const newName = e.target.value;
                                      setEditedSpeakers(prev => ({
                                        ...prev,
                                        [speaker.speaker]: { 
                                          ...prev[speaker.speaker], 
                                          name: newName 
                                        }
                                      }));
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-400 block">Role:</label>
                                  <input 
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                                    defaultValue={speaker.role || ''}
                                    placeholder="Enter role"
                                    onChange={(e) => {
                                      const newRole = e.target.value;
                                      setEditedSpeakers(prev => ({
                                        ...prev,
                                        [speaker.speaker]: { 
                                          ...prev[speaker.speaker], 
                                          role: newRole 
                                        }
                                      }));
                                    }}
                                  />
                                </div>
                                <button 
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                                  onClick={() => {
                                    const edits = editedSpeakers[speaker.speaker] || {};
                                    updateSpeakerInfo(
                                      speaker.speaker, 
                                      edits.name, 
                                      edits.role
                                    );
                                  }}
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="text-sm text-gray-400">ID: {speaker.speaker}</div>
                                <div className="text-sm text-gray-400">Role: {speaker.role || ''}</div>
                              </>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">Segments</div>
                            <div className="text-sm font-medium flex items-center gap-1">
                              {speaker.segments}
                              {speaker.segments > 0 && (
                                <div className="flex flex-col ml-2">
                                  <button 
                                    onClick={() => navigateToPrevSegment(speaker.speaker)}
                                    className="text-gray-400 hover:text-teal-300 p-1"
                                    title="Go to previous segment"
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button 
                                    onClick={() => navigateToNextSegment(speaker.speaker)}
                                    className="text-gray-400 hover:text-teal-300 p-1"
                                    title="Go to next segment"
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                            {speaker.segments > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {currentIndex + 1} of {totalSegments}
                              </div>
                            )}
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
                    );
                  })}
                </div>
              </div>
              
              {/* Summary Section - NEW */}
              {transcription.summaryJson && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Summary</h2>
                  <div className="bg-black bg-opacity-80 rounded-lg p-6 space-y-5">
                    {Object.entries(transcription.summaryJson).map(([filename, content]) => (
                      <div key={filename}>
                        {/* Summary Text */}
                        <div className="mb-5">
                          <h3 className="text-sm text-gray-400 uppercase mb-2 font-medium">Overview</h3>
                          <p className="text-gray-200 bg-black/30 p-4 rounded-lg">{content.summary}</p>
                        </div>
                        
                        {/* Key Moments */}
                        {content.key_moments && content.key_moments.length > 0 && (
                          <div className="mb-5">
                            <h3 className="text-sm text-gray-400 uppercase mb-2 font-medium">Key Moments</h3>
                            <ul className="space-y-2">
                              {content.key_moments.map((moment, idx) => (
                                <li key={idx} className="flex items-start gap-2 bg-black/30 p-3 rounded-lg">
                                  <span className="text-blue-400 mt-0.5 text-lg">•</span>
                                  <span className="text-gray-300">{moment}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Themes */}
                        {content.themes && content.themes.length > 0 && (
                          <div>
                            <h3 className="text-sm text-gray-400 uppercase mb-2 font-medium">Themes</h3>
                            <div className="flex flex-wrap gap-2">
                              {content.themes.map((theme, idx) => (
                                <span 
                                  key={idx} 
                                  className="bg-blue-900/40 text-blue-300 px-3 py-1 rounded-full"
                                >
                                  {theme}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Transcript Timeline */}
              <div>
                <h2 className="text-xl font-bold mb-4">Transcript Timeline</h2>
                <div 
                  ref={timelineRef}
                  className="space-y-4 max-h-[500px] overflow-y-auto pr-2"
                >
                  {transcription.transcript.map((segment) => (
                    <div
                      key={segment.segment_id}
                      ref={el => {
                        if (el) segmentRefs.current[segment.segment_id] = el;
                      }}
                      className="p-5 rounded-lg border border-gray-800 bg-black bg-opacity-80"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-[#45b7aa] text-white">
                          {segment.name || segment.speaker}
                        </Badge>
                        <span className="text-sm text-gray-400">
                          {formatDuration(segment.start)} - {formatDuration(segment.end)}
                        </span>
                      </div>
                      
                      <div className="text-gray-400 text-sm mb-1">Speaker ID: {segment.speaker}</div>
                      
                      {segment.role && (
                        <div className="text-gray-400 text-sm mb-1">Role: {segment.role}</div>
                      )}
                      
                      <p className="text-gray-200">{segment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 