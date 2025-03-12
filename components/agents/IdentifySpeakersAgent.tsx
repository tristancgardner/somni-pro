"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { FiLoader } from "react-icons/fi";

interface TranscriptionFile {
  key: string;         // S3 key
  filename: string;
  downloadUrl: string; // URL to JSON transcript
}

// Add types for speaker labels
interface SpeakerLabel {
  role: string;
  name: string;
}

interface SpeakerLabels {
  [key: string]: SpeakerLabel;
}

/** 
 * Props:
 * 1) selectedFiles: array of transcription files user has selected 
 *    (could be a single file or multiple)
 * 2) onClose: a callback if you want to let the parent hide this panel
 **/
interface IdentifySpeakersAgentProps {
  selectedFiles: TranscriptionFile[];
  onClose?: () => void;
}

export default function IdentifySpeakersAgent({
  selectedFiles,
  onClose,
}: IdentifySpeakersAgentProps) {
  // State for speaker context rows
  // For each row: { name: "", position: "" }
  const [contextRows, setContextRows] = useState<Array<{ name: string; position: string }>>([
    { name: "", position: "" },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  
  // Store identified speaker labels and original transcript
  const [speakerLabels, setSpeakerLabels] = useState<SpeakerLabels>({});
  const [currentTranscript, setCurrentTranscript] = useState<any>(null);
  const [editedSpeakerLabels, setEditedSpeakerLabels] = useState<SpeakerLabels>({});
  const [editMode, setEditMode] = useState(false);

  // Add a row
  const handleAddRow = () => {
    setContextRows((prev) => [...prev, { name: "", position: "" }]);
  };

  // Remove a row
  const handleRemoveRow = (index: number) => {
    setContextRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Update row
  const handleChangeRow = (index: number, field: "name" | "position", value: string) => {
    setContextRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Build userContext from the table
  // e.g. "Michael is BDR. Julie is CTO..."
  const buildUserContext = (): string => {
    const lines = contextRows
      .filter((row) => row.name.trim() && row.position.trim())
      .map((row) => `${row.name} is ${row.position}`);
    return lines.join(". ") + (lines.length ? "." : "");
  };

  // Fetch transcript from your /api/fetch-transcription
  const fetchTranscriptJson = async (downloadUrl: string) => {
    const res = await fetch("/api/fetch-transcription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonUrl: downloadUrl }),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch transcription: ${res.statusText}`);
    }
    return res.json();
  };

  // Identify speakers
  const handleIdentifySpeakers = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("No files selected");
      return;
    }

    const userContext = buildUserContext();
    setIsProcessing(true);
    setProcessingComplete(false);
    setSpeakerLabels({});
    setCurrentTranscript(null);
    setEditedSpeakerLabels({});

    try {
      const file = selectedFiles[currentFileIndex];
      const transcriptData = await fetchTranscriptJson(file.downloadUrl);
      if (!Array.isArray(transcriptData?.transcript)) {
        toast.error(`Invalid transcript data for ${file.filename}`);
        setIsProcessing(false);
        return;
      }

      // Store the original transcript
      setCurrentTranscript(transcriptData);

      const bodyPayload = {
        fileName: file.filename,
        transcript: transcriptData.transcript,
        userContext,
      };

      const response = await fetch("/api/agents/identify-speakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(`Error for ${file.filename}: ${data.error}`);
        setIsProcessing(false);
        return;
      }

      // Store the speaker labels
      setSpeakerLabels(data.speakerLabels || {});
      setEditedSpeakerLabels(data.speakerLabels || {});
      setProcessingComplete(true);
      toast.success(`Speaker identification complete for ${file.filename}`);
    } catch (err: any) {
      console.error("Error identifying speakers:", err);
      toast.error(`Failed to identify speakers: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to identification mode
  const handleRerun = () => {
    setProcessingComplete(false);
    setSpeakerLabels({});
    setCurrentTranscript(null);
    setEditedSpeakerLabels({});
  };

  // Enable edit mode for manual corrections
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  // Update a speaker's role or name
  const updateSpeakerLabel = (speaker: string, field: "role" | "name", value: string) => {
    setEditedSpeakerLabels(prev => ({
      ...prev,
      [speaker]: {
        ...prev[speaker],
        [field]: value
      }
    }));
  };

  // Apply speaker labels to transcript and save
  const handleApprove = async () => {
    if (!currentTranscript || Object.keys(editedSpeakerLabels).length === 0) {
      toast.error("No transcript or speaker labels available");
      return;
    }

    setIsSaving(true);

    try {
      // Apply speaker labels to the transcript segments
      const updatedTranscript = {
        ...currentTranscript,
        transcript: currentTranscript.transcript.map((segment: any) => {
          const speakerLabel = editedSpeakerLabels[segment.speaker];
          if (speakerLabel) {
            return {
              ...segment,
              role: speakerLabel.role,
              name: speakerLabel.name
            };
          }
          return segment;
        })
      };

      // Save the updated transcript
      const file = selectedFiles[currentFileIndex];
      const response = await fetch('/api/save-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionData: updatedTranscript,
          jsonUrl: file.downloadUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save transcript');
      }

      toast.success(`Speaker labels applied and saved to ${file.filename}`);

      // Handle next file or complete
      if (currentFileIndex < selectedFiles.length - 1) {
        setCurrentFileIndex(currentFileIndex + 1);
        setProcessingComplete(false);
        setSpeakerLabels({});
        setCurrentTranscript(null);
        setEditedSpeakerLabels({});
      } else {
        // All files processed
        if (onClose) {
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Error saving transcript:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Link to transcription viewer with temporarily applied labels
  const viewTranscriptWithLabels = async () => {
    if (!selectedFiles.length || currentFileIndex >= selectedFiles.length || !currentTranscript) {
      toast.error("Transcript data not available");
      return;
    }

    try {
      setIsProcessing(true);
      
      console.log("Original transcript segment example:", currentTranscript.transcript[0]);
      console.log("Speaker labels to apply:", editMode ? editedSpeakerLabels : speakerLabels);

      // Create a temporary version of the transcript with labels applied
      const tempTranscript = {
        ...currentTranscript,
        transcript: currentTranscript.transcript.map((segment: any) => {
          const speakerLabel = editMode ? editedSpeakerLabels[segment.speaker] : speakerLabels[segment.speaker];
          if (speakerLabel) {
            // Explicitly ensure both role and name are set for every segment
            return {
              ...segment,
              role: speakerLabel.role || "Unknown",
              name: speakerLabel.name || segment.speaker
            };
          }
          return {
            ...segment,
            role: "Unknown",  // Default fallback values
            name: segment.speaker
          };
        })
      };

      // Log the processed transcript to verify it has the right structure
      console.log("Preview transcript with applied labels:", tempTranscript.transcript[0]);

      // Save this temporarily to localStorage to avoid URL length limitations
      const tempId = `temp_transcript_${Date.now()}`;
      localStorage.setItem(tempId, JSON.stringify({
        transcript: tempTranscript,
        speakerLabels: editMode ? editedSpeakerLabels : speakerLabels
      }));
      
      console.log("Saved to localStorage with tempId:", tempId);

      // Open the transcript viewer with a reference to the temp storage
      const file = selectedFiles[currentFileIndex];
      const viewerUrl = `/transcription-viewer?url=${encodeURIComponent(file.downloadUrl)}&tempId=${tempId}`;
      console.log("Opening transcript viewer URL:", viewerUrl);
      window.open(viewerUrl, '_blank');
    } catch (err: any) {
      console.error('Error preparing transcript for viewing:', err);
      toast.error("Failed to prepare transcript for viewing");
    } finally {
      setIsProcessing(false);
    }
  };

  // Set up message listener for returning from transcript viewer
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;
      
      // Check for our specific message type
      if (event.data && event.data.type === 'RETURN_TO_IDENTIFY_SPEAKERS') {
        try {
          const { tempId, edits } = event.data;
          
          if (tempId && edits) {
            // Update our edited speaker labels with the changes from the transcript viewer
            setEditedSpeakerLabels(prevLabels => ({
              ...prevLabels,
              ...edits
            }));
            
            setEditMode(true); // Show in edit mode to make changes visible
            toast.success('Speaker labels updated from transcript viewer');
          }
        } catch (error) {
          console.error('Error handling message from transcript viewer:', error);
        }
      }
    };
    
    // Add the event listener
    window.addEventListener('message', handleMessage);
    
    // Clean up the listener when component unmounts
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div className="mt-4 p-4 bg-black/20 backdrop-blur-sm rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Identify Speakers</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="px-2 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
          >
            Close
          </button>
        )}
      </div>

      {/* Progress indicator for multiple files */}
      {selectedFiles.length > 1 && (
        <div className="mb-4 text-sm">
          Processing file {currentFileIndex + 1} of {selectedFiles.length}: 
          <span className="font-medium ml-1">{selectedFiles[currentFileIndex]?.filename}</span>
        </div>
      )}

      {/* Instructions */}
      <p className="text-sm mb-4">
        This agent analyzes the dialog to assign role-based speaker labels (Interviewer, Interviewee, etc.) and 
        tries to infer real names from the context you provide below.
      </p>

      {/* Selected files displayed */}
      <div className="mb-4">
        <p className="text-sm font-medium text-blue-300 mb-1">Selected Files:</p>
        <ul className="list-disc list-inside text-gray-200">
          {selectedFiles.map((f) => (
            <li key={f.key}>{f.filename}</li>
          ))}
        </ul>
      </div>

      {!processingComplete ? (
        <>
          {/* The table for speaker context */}
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-700 text-sm mb-4">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-3 py-2 border-r border-gray-700">Name</th>
                  <th className="px-3 py-2 border-r border-gray-700">Context / Position</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contextRows.map((row, index) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="px-3 py-2 border-r border-gray-700">
                      <input
                        type="text"
                        className="w-full bg-gray-800 p-2 rounded text-white"
                        placeholder="e.g. Michael"
                        value={row.name}
                        onChange={(e) => handleChangeRow(index, "name", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 border-r border-gray-700">
                      <input
                        type="text"
                        className="w-full bg-gray-800 p-2 rounded text-white"
                        placeholder="e.g. BDR - talks about customer success"
                        value={row.position}
                        onChange={(e) => handleChangeRow(index, "position", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {index > 0 && (
                        <button
                          onClick={() => handleRemoveRow(index)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={handleAddRow}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white mb-4 text-sm"
            >
              + Add another speaker
            </button>
          </div>

          {/* Run Button */}
          <div className="flex justify-end">
            <button
              onClick={handleIdentifySpeakers}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm flex items-center gap-2"
            >
              {isProcessing && <FiLoader className="animate-spin" />}
              {isProcessing ? "Identifying..." : "Run Identify Speakers"}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Results Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-semibold">Speaker Identification Results:</h4>
              <div className="flex gap-2">
                <button 
                  onClick={toggleEditMode}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                  {editMode ? "View Only" : "Edit Labels"}
                </button>
                <button 
                  onClick={handleRerun}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                  Add More Context & Re-Run
                </button>
              </div>
            </div>
            
            <div className="bg-black/30 p-4 rounded-lg">
              <table className="w-full text-sm mb-3">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Speaker ID</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(editMode ? editedSpeakerLabels : speakerLabels).map(([speaker, info]) => (
                    <tr key={speaker} className="border-b border-gray-700">
                      <td className="px-3 py-2">{speaker}</td>
                      <td className="px-3 py-2">
                        {editMode ? (
                          <select
                            value={info.role}
                            onChange={(e) => updateSpeakerLabel(speaker, "role", e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded p-1"
                          >
                            <option value="Interviewee">Interviewee</option>
                            <option value="Interviewer">Interviewer</option>
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          info.role
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editMode ? (
                          <input
                            type="text"
                            value={info.name}
                            onChange={(e) => updateSpeakerLabel(speaker, "name", e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded p-1 w-full"
                          />
                        ) : (
                          info.name
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="flex justify-between items-center">
                <button
                  onClick={viewTranscriptWithLabels}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview with Labels
                </button>
                
                <button
                  onClick={handleApprove}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white flex items-center gap-2"
                >
                  {isSaving && <FiLoader className="animate-spin" />}
                  {isSaving ? "Saving..." : "Approve & Save"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
