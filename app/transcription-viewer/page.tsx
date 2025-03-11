"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Users, ArrowLeft, Save, ChevronRight, ChevronLeft } from 'lucide-react';
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

  // Apply speaker edits to all segments with the same speaker ID
  const updateSpeakerInfo = (speakerId: string, name?: string, role?: string) => {
    if (!transcription) return;
    
    // Update edited speakers record
    setEditedSpeakers(prev => ({
      ...prev,
      [speakerId]: { name, role }
    }));
    
    // Apply edits to transcription data
    const updatedTranscript = {
      ...transcription,
      transcript: transcription.transcript.map(segment => {
        if (segment.speaker === speakerId) {
          return {
            ...segment,
            name: name !== undefined ? name : segment.name,
            role: role !== undefined ? role : segment.role
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
      
      const response = await fetch('/api/save-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionData: transcription,
          jsonUrl: sourceUrl,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSaveSuccess(true);
        setSaveMessage('Transcription saved successfully');
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
  }, [url, activeFileIndex, projectFiles]);

  // If we're in project view (with multiple files)
  const isProjectView = projectId !== null && projectFiles.length > 0;

  // Add back button handler
  const handleBack = () => {
    router.push('/file-viewer');
  };

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
                  {speakerStats.map((speaker, index) => (
                    <div key={index} className="bg-black bg-opacity-80 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#45b7aa] text-white mb-2">
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
                                    const newName = e.target.value.trim() || undefined;
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
                                    const newRole = e.target.value.trim() || undefined;
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
                                    edits.name !== undefined ? edits.name : speaker.name, 
                                    edits.role !== undefined ? edits.role : speaker.role
                                  );
                                }}
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm text-gray-400">ID: {speaker.speaker}</div>
                              {speaker.role && (
                                <div className="text-sm text-gray-400">{speaker.role}</div>
                              )}
                            </>
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
                        <Badge className="bg-[#45b7aa] text-white">
                          {segment.name || segment.speaker}
                        </Badge>
                        <span className="text-sm text-gray-400">
                          {formatDuration(segment.start)} - {formatDuration(segment.end)}
                        </span>
                      </div>
                      
                      {segment.speaker !== segment.name && segment.name && (
                        <div className="text-gray-400 text-sm mb-1">Speaker ID: {segment.speaker}</div>
                      )}
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