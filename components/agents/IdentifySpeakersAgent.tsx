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

  // 2) Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
   * Fetch the diarizer JSON from file.downloadUrl
   * or if you want, directly fetch from S3. 
   * In your snippet, you used a separate route `/api/fetch-transcription`
   * but you can call the `downloadUrl` directly if it's public.
   */
  const fetchTranscriptJson = async (downloadUrl: string) => {
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch transcription from ${downloadUrl}`);
    }
    return res.json();
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

    try {
      // We process a single file at a time
      const file = selectedFiles[currentFileIndex];
      // 1) fetch the transcript from your JSON
      const transcriptData = await fetchTranscriptJson(file.downloadUrl);

      if (!Array.isArray(transcriptData?.transcript)) {
        toast.error(`Invalid transcript data for ${file.filename}`);
        return;
      }
      setCurrentTranscript(transcriptData);

      // Build the userContext from the table
      const userContext = buildUserContext();

      // 2) Construct payload
      const bodyPayload = {
        fileName: file.filename,
        transcript: transcriptData.transcript,
        userContext, // e.g. "Trent is Father. Amber is Mother."
      };

      // 3) POST to /api/agents/identify-speakers
      const response = await fetch("/api/agents/identify-speakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(`Error for ${file.filename}: ${data.error || "Unknown error"}`);
        return;
      }

      // 4) Save the speakerLabels returned
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

  /** 
   * If you want to re-run after adding more context,
   * reset the states.
   */
  const handleRerun = () => {
    setProcessingComplete(false);
    setSpeakerLabels({});
    setCurrentTranscript(null);
    setEditedSpeakerLabels({});
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
      // Optionally unify speakers if they share the same name & role
      // For example, grouping them so that if SPEAKER_00 and SPEAKER_01
      // both have { name: "Trent", role: "Interviewee" }, 
      // you keep them as one label in the final JSON, etc.
      //
      // This part is your custom logic.

      const file = selectedFiles[currentFileIndex];
      
      // Example: Just write the updated speaker info directly onto each segment
      const updatedTranscript = {
        ...currentTranscript,
        transcript: currentTranscript.transcript.map((segment: any) => {
          const label = editedSpeakerLabels[segment.speaker];
          if (label) {
            return {
              ...segment,
              role: label.role,
              name: label.name,
            };
          }
          return segment;
        }),
      };

      // Optionally, call your own API to save it:
      // e.g. `/api/save-transcription` or upload back to S3
      // This snippet just triggers a download of the updated file
      const blob = new Blob([JSON.stringify(updatedTranscript, null, 2)], {
        type: "application/json",
      });
      const tempUrl = URL.createObjectURL(blob);
      const dl = document.createElement("a");
      const newFilename = file.filename.replace(".json", "_with_speakers.json");
      dl.href = tempUrl;
      dl.download = newFilename;
      dl.click();
      URL.revokeObjectURL(tempUrl);

      toast.success(`Speaker labels applied to ${file.filename}. Downloaded new file.`);

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

      {!processingComplete ? (
        <>
          <p className="text-sm mb-3">
            Provide known context about speakers below. For example: 
            <br />
            <strong>Trent is father.</strong> <strong>Amber is mother.</strong>
          </p>

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

          <div className="mt-4 flex justify-end">
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
