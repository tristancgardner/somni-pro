"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { FiLoader } from "react-icons/fi";

// Minimal shape for a transcription file
interface TranscriptionFile {
  key: string;         // S3 key (optional if you want)
  filename: string;
  downloadUrl: string; // URL to JSON transcript
}

// This is the shape the route returns for each speaker
interface SpeakerLabel {
  role: string;
  name: string;
}

interface SpeakerLabels {
  [key: string]: SpeakerLabel;
}

/** 
 * Props:
 *  - selectedFiles: array of transcription files user has selected
 *  - onClose: optional callback if you want to hide this panel
 */
interface IdentifySpeakersAgentProps {
  selectedFiles: TranscriptionFile[];
  onClose?: () => void;
}

export default function IdentifySpeakersAgent({
  selectedFiles,
  onClose,
}: IdentifySpeakersAgentProps) {
  // 1) Speaker context input
  // Each row: { name, position }
  // e.g. row: { name: "Trent", position: "Father" }
  const [contextRows, setContextRows] = useState<Array<{ name: string; position: string }>>([
    { name: "", position: "" },
  ]);

  // Add state for number of speakers
  const [speakerCount, setSpeakerCount] = useState<number>(2);

  // Add state for conversation type
  const [conversationType, setConversationType] = useState<string>("interview");

  // 2) Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Because your code processes files one by one, track the current index
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);

  // 3) Once the route returns labels, we store them
  const [speakerLabels, setSpeakerLabels] = useState<SpeakerLabels>({});
  const [processingComplete, setProcessingComplete] = useState(false);

  // 4) Also store the raw transcript from your diarizer JSON
  const [currentTranscript, setCurrentTranscript] = useState<any>(null);

  // 5) Provide an "edit mode" to tweak roles/names
  const [editMode, setEditMode] = useState(false);
  const [editedSpeakerLabels, setEditedSpeakerLabels] = useState<SpeakerLabels>({});

  // Add a reference to track cancellation
  const processingRef = React.useRef<boolean>(false);

  /** Add or remove rows in the context table */
  const handleAddRow = () => {
    setContextRows((prev) => [...prev, { name: "", position: "" }]);
  };
  const handleRemoveRow = (idx: number) => {
    setContextRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChangeRow = (idx: number, field: "name" | "position", value: string) => {
    setContextRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  /** 
   * Build a single string for userContext, e.g.:
   * "Trent is Father. Amber is Mother."
   */
  const buildUserContext = (): string => {
    const lines = contextRows
      .filter((row) => row.name.trim() && row.position.trim())
      .map((row) => `${row.name} is ${row.position}`);
    // Join sentences with a period
    return lines.join(". ") + (lines.length ? "." : "");
  };

  /** 
   * Parse context rows into structured format
   */
  const buildStructuredContext = () => {
    const knownSpeakers = contextRows
      .filter((row) => row.name.trim() && row.position.trim())
      .map((row) => ({
        name: row.name.trim(),
        role: row.position.trim(),
        relevance: "primary"
      }));
    
    return {
      conversationType,
      knownSpeakers
    };
  };

  /**
   * Fetch the diarizer JSON from file.downloadUrl
   * or if you want, directly fetch from S3. 
   * In your snippet, you used a separate route `/api/fetch-transcription`
   * but you can call the `downloadUrl` directly if it's public.
   */
  const fetchTranscriptJson = async (downloadUrl: string) => {
    try {
      console.log('Fetching transcript from:', downloadUrl);
      const res = await fetch('/api/fetch-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ downloadUrl }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      return data;
    } catch (error: unknown) {
      console.error('Error fetching transcript:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch transcription: ${errorMessage}`);
    }
  };

  /** 
   * Core action: POST transcript + userContext to /api/agents/identify-speakers
   */
  const handleIdentifySpeakers = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("No files selected");
      return;
    }

    setIsProcessing(true);
    setProcessingComplete(false);
    setSpeakerLabels({});
    setCurrentTranscript(null);
    setEditedSpeakerLabels({});
    setError(null);
    setProcessingTime(null);
    processingRef.current = true;

    try {
      // We process a single file at a time
      const file = selectedFiles[currentFileIndex];
      // 1) fetch the transcript from your JSON
      const transcriptData = await fetchTranscriptJson(file.downloadUrl);

      if (!Array.isArray(transcriptData?.transcript)) {
        toast.error(`Invalid transcript data for ${file.filename}`);
        setError(`Invalid transcript data for ${file.filename}`);
        return;
      }
      setCurrentTranscript(transcriptData);

      // Build the structured context from the table
      const userContext = buildStructuredContext();

      // 2) Construct payload
      const bodyPayload = {
        fileName: file.filename,
        transcript: transcriptData.transcript,
        userContext,
        speakerCount,
      };

      // Show status message for long-running operations
      const processingToastId = toast.loading(
        "Identifying speakers. This may take a few minutes...", 
        { duration: Infinity }
      );

      try {
        const response = await fetch("/api/agents/identify-speakers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });

        toast.dismiss(processingToastId);

        if (!processingRef.current) {
          // Operation was cancelled
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          const errorMsg = data.error || `Error for ${file.filename}: ${response.statusText}`;
          toast.error(errorMsg);
          setError(errorMsg);
          return;
        }

        // 4) Save the speakerLabels returned
        setSpeakerLabels(data.speakerLabels || {});
        setEditedSpeakerLabels(data.speakerLabels || {});
        setProcessingComplete(true);
        setProcessingTime(data.processingTimeMs || null);

        toast.success(`Speaker identification complete for ${file.filename}`);
      } catch (err: any) {
        toast.dismiss(processingToastId);
        
        const errorMsg = `Failed to identify speakers: ${err.message}`;
        console.error("Error identifying speakers:", err);
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error("Error in transcript processing:", err);
      const errorMsg = `Error processing transcript: ${err.message}`;
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  /** 
   * Cancel ongoing processing
   */
  const handleCancel = () => {
    processingRef.current = false;
    setIsProcessing(false);
    toast.error("Speaker identification cancelled");
  };

  /** 
   * If you want to re-run after adding more context,
   * reset the states.
   */
  const handleRerun = () => {
    setProcessingComplete(false);
    setSpeakerLabels({});
    setCurrentTranscript(null);
    setEditedSpeakerLabels({});
    setError(null);
    setProcessingTime(null);
  };

  /** Toggle edit mode */
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  /** Update a speaker's role or name in local state */
  const updateSpeakerLabel = (speakerId: string, field: "role" | "name", value: string) => {
    setEditedSpeakerLabels((prev) => ({
      ...prev,
      [speakerId]: {
        ...prev[speakerId],
        [field]: value,
      },
    }));
  };

  /**
   * Approve and save means:
   * - Possibly unify identical speakers (same name+role).
   * - Update the transcript.
   * - POST to your /api/save-transcription or something similar.
   */
  const handleApprove = async () => {
    if (!currentTranscript || !Object.keys(editedSpeakerLabels).length) {
      toast.error("No transcript or speaker labels available");
      return;
    }

    setIsSaving(true);

    try {
      const file = selectedFiles[currentFileIndex];
      
      // Group speakers with the same name and role
      const speakerGroups: Record<string, string[]> = {};
      const uniqueLabels: Record<string, { name?: string, role?: string }> = {};
      
      // First pass: gather all unique name+role combinations
      Object.entries(editedSpeakerLabels).forEach(([speakerId, info]) => {
        if (info.name && info.role) {
          const groupKey = `${info.name}|${info.role}`;
          
          if (!speakerGroups[groupKey]) {
            speakerGroups[groupKey] = [];
            uniqueLabels[groupKey] = { 
              name: info.name, 
              role: info.role 
            };
          }
          
          if (!speakerGroups[groupKey].includes(speakerId)) {
            speakerGroups[groupKey].push(speakerId);
          }
        }
      });
      
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

      // Apply the mapping to consolidate speakers and update labels
      const updatedTranscript = {
        ...currentTranscript,
        transcript: currentTranscript.transcript.map((segment: any) => {
          const originalSpeakerId = segment.speaker;
          const mappedSpeakerId = speakerIdMap[originalSpeakerId] || originalSpeakerId;
          const label = editedSpeakerLabels[mappedSpeakerId];

          if (label) {
            return {
              ...segment,
              speaker: mappedSpeakerId,
              role: label.role,
              name: label.name,
            };
          }
          return segment;
        }),
      };

      // Save the updated transcript using the API
      const saveResponse = await fetch('/api/save-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionData: updatedTranscript,
          jsonUrl: file.downloadUrl,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save transcript');
      }

      // Generate a temporary ID for storing the results
      const tempId = `temp_transcript_${Date.now()}`;
      
      // Store the updated transcript and speaker labels in localStorage
      localStorage.setItem(tempId, JSON.stringify({
        transcript: updatedTranscript,
        speakerLabels: editedSpeakerLabels
      }));

      // Open the transcript viewer in a new tab with the temp ID
      const viewerUrl = `/transcription-viewer?tempId=${tempId}&url=${encodeURIComponent(file.downloadUrl)}`;
      window.open(viewerUrl, '_blank');

      toast.success(`Speaker labels applied to ${file.filename}`);

      // Move to the next file if multiple
      if (currentFileIndex < selectedFiles.length - 1) {
        // Advance to next
        setCurrentFileIndex(currentFileIndex + 1);
        setProcessingComplete(false);
        setSpeakerLabels({});
        setCurrentTranscript(null);
        setEditedSpeakerLabels({});
      } else {
        // All done
        if (onClose) onClose();
      }
    } catch (err: any) {
      console.error("Error saving transcript:", err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-black/20 p-4 rounded-md text-white">
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

      {selectedFiles.length > 1 && (
        <div className="mb-4 text-sm">
          File {currentFileIndex + 1} of {selectedFiles.length}:
          <span className="font-medium ml-1">{selectedFiles[currentFileIndex]?.filename}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-md text-sm">
          <p className="font-semibold mb-1">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {!processingComplete ? (
        <>
          <p className="text-sm mb-3">
            Provide known context about speakers below. For example: 
            <br />
            <strong>Trent is father.</strong> <strong>Amber is mother.</strong>
          </p>

          {/* Add conversation type dropdown */}
          <div className="mb-4">
            <label className="block text-sm mb-1">Conversation type:</label>
            <select
              value={conversationType}
              onChange={(e) => setConversationType(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white p-1 w-full"
            >
              <option value="interview">Interview</option>
              <option value="meeting">Meeting</option>
              <option value="podcast">Podcast</option>
              <option value="conversation">Casual Conversation</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Add speaker count dropdown */}
          <div className="mb-4">
            <label className="block text-sm mb-1">Number of speakers in recording:</label>
            <div className="flex items-center">
              <input
                type="number"
                min="1"
                max="10"
                value={speakerCount}
                onChange={(e) => setSpeakerCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-gray-800 border border-gray-700 text-white p-1 w-20 mr-2"
              />
              <select
                value={speakerCount}
                onChange={(e) => setSpeakerCount(parseInt(e.target.value))}
                className="bg-gray-800 border border-gray-700 text-white p-1"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num} speaker{num !== 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <table className="min-w-full text-sm mb-3">
            <thead>
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Position / Role</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {contextRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-2">
                    <input
                      value={row.name}
                      onChange={(e) => handleChangeRow(idx, "name", e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white p-1 w-full"
                      placeholder="Trent"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      value={row.position}
                      onChange={(e) => handleChangeRow(idx, "position", e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white p-1 w-full"
                      placeholder="Father, interviewee, etc."
                    />
                  </td>
                  <td className="p-2">
                    {idx > 0 && (
                      <button
                        onClick={() => handleRemoveRow(idx)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
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
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-sm"
          >
            + Add Another
          </button>

          <div className="mt-4 flex justify-end gap-2">
            {isProcessing && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleIdentifySpeakers}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-2"
            >
              {isProcessing && <FiLoader className="animate-spin" />}
              {isProcessing ? "Identifying..." : "Identify Speakers"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-md font-semibold">Speaker Identification Results</h4>
            <div className="space-x-2">
              <button
                onClick={toggleEditMode}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              >
                {editMode ? "View Only" : "Edit Labels"}
              </button>
              <button
                onClick={handleRerun}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Rerun
              </button>
            </div>
          </div>

          {processingTime && (
            <p className="text-xs text-gray-400 mb-2">
              Processing completed in {(processingTime / 1000).toFixed(1)} seconds
            </p>
          )}

          <table className="min-w-full text-sm mb-3 border border-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-2 text-left">Speaker ID</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Name</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(editMode ? editedSpeakerLabels : speakerLabels).map(([speakerId, info]) => (
                <tr key={speakerId} className="border-b border-gray-700">
                  <td className="p-2">{speakerId}</td>
                  <td className="p-2">
                    {editMode ? (
                      <select
                        value={info.role}
                        onChange={(e) => updateSpeakerLabel(speakerId, "role", e.target.value)}
                        className="bg-gray-800 border border-gray-700 p-1"
                      >
                        <option value="Interviewee">Interviewee</option>
                        <option value="Interviewer">Interviewer</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      info.role
                    )}
                  </td>
                  <td className="p-2">
                    {editMode ? (
                      <input
                        type="text"
                        value={info.name}
                        onChange={(e) => updateSpeakerLabel(speakerId, "name", e.target.value)}
                        className="bg-gray-800 border border-gray-700 p-1 w-full"
                      />
                    ) : (
                      info.name
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <button
              onClick={handleApprove}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-2"
            >
              {isSaving && <FiLoader className="animate-spin" />}
              {isSaving ? "Saving..." : "Approve & Save"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
