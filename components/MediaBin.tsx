import React, { useState, useEffect } from "react";
import { FiDownload, FiFileText, FiTrash2, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import FileSpeakers from "@/components/FileSpeakers";
import SpeakerTag from "./SpeakerTag";

type TranscriptionFile = {
  key: string;
  filename: string;
  size: number;
  lastModified: Date;
  downloadUrl: string;
  projectId: string | null;
  projectName: string | null;
};

type Speaker = {
  id?: string;
  name: string;
  role: string;
};

type SpeakerMap = {
  [speakerId: string]: Speaker;
};

type FileWithSpeakers = TranscriptionFile & {
  speakers?: Speaker[];
};

type MediaBinProps = {
  transcriptions: TranscriptionFile[];
  selectedFiles: string[];
  onSelectFile: (key: string) => void;
  onViewFile: (url: string, file: TranscriptionFile) => void;
  onDeleteFile: (key: string, filename: string) => void;
  resultsPage: number;
  maxResultsPerPage: number;
  hasMoreTranscriptions: boolean;
  onPageChange: (direction: 'prev' | 'next') => void;
  isLoadingTranscriptions: boolean;
  clearSelectedFiles: () => void;
  selectAllFiles: () => void;
  currentProject?: boolean;
};

const MediaBin: React.FC<MediaBinProps> = ({
  transcriptions,
  selectedFiles,
  onSelectFile,
  onViewFile,
  onDeleteFile,
  resultsPage,
  maxResultsPerPage,
  hasMoreTranscriptions,
  onPageChange,
  isLoadingTranscriptions,
  clearSelectedFiles,
  selectAllFiles,
  currentProject = false
}) => {
  const [filesWithSpeakers, setFilesWithSpeakers] = useState<FileWithSpeakers[]>([]);
  const [loadingSpeakers, setLoadingSpeakers] = useState<{[key: string]: boolean}>({});

  // Get displayed transcriptions for current page
  const getCurrentPageTranscriptions = () => {
    const startIdx = (resultsPage - 1) * maxResultsPerPage;
    const endIdx = startIdx + maxResultsPerPage;
    return filesWithSpeakers.slice(startIdx, endIdx);
  };

  // Fetch speaker information for visible files
  useEffect(() => {
    const fetchSpeakers = async (file: TranscriptionFile) => {
      // Skip if we've already loaded or are loading this file
      if (loadingSpeakers[file.key]) return;
      
      // Mark as loading
      setLoadingSpeakers(prev => ({ ...prev, [file.key]: true }));
      
      try {
        // Fetch the transcript JSON
        const response = await fetch('/api/fetch-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ downloadUrl: file.downloadUrl }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch transcript');
        }

        const data = await response.json();
        
        let speakers: Speaker[] = [];
        
        // Debug log to see the structure of the transcript data
        console.log(`Transcript data for ${file.filename}:`, {
          hasSpeakerMap: !!data.speakerMap,
          speakerMapSample: data.speakerMap ? Object.keys(data.speakerMap).slice(0, 3) : null,
          hasTranscript: !!data.transcript,
          transcriptSample: data.transcript && Array.isArray(data.transcript) ? 
            data.transcript.slice(0, 2) : null
        });
        
        // Extract speakers from speakerMap if available
        if (data.speakerMap) {
          const speakerMap: SpeakerMap = data.speakerMap;
          const speakerEntries = Object.entries(speakerMap);
          
          console.log("Speaker entries sample:", speakerEntries.slice(0, 3));
          
          // First, collect all speakers from the speakerMap
          const allSpeakers: Speaker[] = speakerEntries.map(([speakerId, speakerInfo]) => {
            // Use the real name if available, otherwise use a formatted ID
            let displayName = speakerInfo.name;
            
            // If no name is provided, format the ID
            if (!displayName || displayName.trim() === '') {
              displayName = speakerId.startsWith('SPEAKER_') ? 
                `Speaker ${speakerId.replace('SPEAKER_', '')}` : 
                `Speaker ${speakerId}`;
            }
            
            return {
              id: speakerId,
              name: displayName,
              role: speakerInfo.role || ''
            };
          });
          
          // Now filter out duplicates if needed
          const uniqueSpeakerMap = new Map<string, Speaker>();
          allSpeakers.forEach(speaker => {
            if (!uniqueSpeakerMap.has(speaker.id)) {
              uniqueSpeakerMap.set(speaker.id, speaker);
            }
          });
          
          speakers = Array.from(uniqueSpeakerMap.values());
        } 
        // If no speakerMap, try to extract from transcript
        else if (data.transcript && Array.isArray(data.transcript)) {
          const speakerIds = new Set<string>();
          
          // Collect all unique speaker IDs
          data.transcript.forEach((segment: any) => {
            if (segment.speaker) {
              speakerIds.add(segment.speaker);
            }
          });
          
          // Create basic speaker objects
          speakers = Array.from(speakerIds).map(id => {
            const displayName = id.startsWith('SPEAKER_') ? 
              `Speaker ${id.replace('SPEAKER_', '')}` : 
              `Speaker ${id}`;
              
            return {
              id,
              name: displayName,
              role: ''
            };
          });
        }
        
        console.log(`Extracted speakers for ${file.filename}:`, speakers);
        
        // Update the file with speakers information
        setFilesWithSpeakers(prev => 
          prev.map(f => 
            f.key === file.key 
              ? { ...f, speakers }
              : f
          )
        );
        
      } catch (err) {
        console.error(`Error fetching speakers for ${file.filename}:`, err);
      }
    };

    // Initialize filesWithSpeakers with new transcriptions
    if (transcriptions.length > 0 && 
        (filesWithSpeakers.length === 0 || 
         filesWithSpeakers[0].key !== transcriptions[0].key)) {
      setFilesWithSpeakers(transcriptions.map(file => ({ ...file })));
      setLoadingSpeakers({});
    }
    
    // Get the currently visible files
    const startIdx = (resultsPage - 1) * maxResultsPerPage;
    const endIdx = startIdx + maxResultsPerPage;
    const visibleFiles = transcriptions.slice(startIdx, endIdx);
    
    // Fetch speakers for all visible files
    visibleFiles.forEach(file => {
      fetchSpeakers(file);
    });
    
  }, [transcriptions, resultsPage, maxResultsPerPage, loadingSpeakers]);

  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 mb-8">
      {getCurrentPageTranscriptions().length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-black/70 rounded-lg">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-10">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.length === getCurrentPageTranscriptions().length && getCurrentPageTranscriptions().length > 0}
                        onChange={() => {
                          if (selectedFiles.length === getCurrentPageTranscriptions().length) {
                            clearSelectedFiles();
                          } else {
                            selectAllFiles();
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                      />
                      <span className="sr-only">Select All</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">File Name</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {getCurrentPageTranscriptions().map((file, index) => (
                  <tr key={index} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.key)}
                        onChange={() => onSelectFile(file.key)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      <div>
                        {file.filename}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {file.speakers && file.speakers.length > 0 ? (
                            <>
                              {file.speakers.map((speaker, i) => (
                                <SpeakerTag 
                                  key={i} 
                                  name={speaker.name} 
                                  role={speaker.role} 
                                />
                              ))}
                            </>
                          ) : (
                            loadingSpeakers[file.key] ? (
                              <span className="text-xs text-gray-400 italic">Loading speakers...</span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No speakers found</span>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewFile(file.downloadUrl, file);
                          }}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-800 rounded-full group relative"
                          title="View"
                        >
                          <FiFileText className="text-lg" />
                          <span className="absolute hidden group-hover:block bg-gray-900 text-xs px-2 py-1 rounded shadow-lg -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                            View
                          </span>
                        </button>
                        <a 
                          href={file.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-800 rounded-full group relative"
                          title="Download"
                        >
                          <FiDownload className="text-lg" />
                          <span className="absolute hidden group-hover:block bg-gray-900 text-xs px-2 py-1 rounded shadow-lg -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                            Download
                          </span>
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFile(file.key, file.filename);
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-full group relative"
                          title="Delete"
                        >
                          <FiTrash2 className="text-lg" />
                          <span className="absolute hidden group-hover:block bg-gray-900 text-xs px-2 py-1 rounded shadow-lg -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                            Delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => onPageChange('prev')}
              disabled={resultsPage <= 1}
              className={`flex items-center gap-1 px-3 py-1 rounded ${
                resultsPage <= 1
                ? "text-gray-500 cursor-not-allowed"
                : "text-blue-400 hover:text-blue-300"
              }`}
            >
              <FiChevronLeft /> Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {resultsPage}
            </span>
            <button
              onClick={() => onPageChange('next')}
              disabled={!hasMoreTranscriptions && transcriptions.length <= resultsPage * maxResultsPerPage}
              className={`flex items-center gap-1 px-3 py-1 rounded ${
                !hasMoreTranscriptions && transcriptions.length <= resultsPage * maxResultsPerPage
                ? "text-gray-500 cursor-not-allowed"
                : "text-blue-400 hover:text-blue-300"
              }`}
            >
              Next <FiChevronRight />
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-400">
          {isLoadingTranscriptions ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            "No files found in this project. Add files to get started."
          )}
        </div>
      )}
    </div>
  );
};

export default MediaBin; 