"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { FiLoader } from "react-icons/fi";

// Minimal shape for a transcription file
interface TranscriptionFile {
  key: string;         // S3 key (optional)
  filename: string;
  downloadUrl: string; // URL to JSON transcript
}

// The shape returned by the route
interface SummaryJson {
  [key: string]: {
    summary: string;
    themes: string[];
    key_speakers: Record<string, string>;
  };
}

// Alternatively, we could define a type for the entire response object
interface SummarizeResponse {
  success?: boolean;
  summaryJson?: SummaryJson;
  error?: string;
}

/** 
 * Props:
 *  - selectedFiles: array of transcription files user has selected
 *  - onClose: optional callback if you want to hide this panel
 */
interface SummarizeNarrativeAgentProps {
  selectedFiles: TranscriptionFile[];
  onClose?: () => void;
}

export default function SummarizeNarrativeAgent({
  selectedFiles,
  onClose,
}: SummarizeNarrativeAgentProps) {
  // 1) We'll capture user context as rows of "Name" + "Position/Role"
  //    (like IdentifySpeakers, but we're just using them as arbitrary lines of context).
  const [contextRows, setContextRows] = useState<Array<{ name: string; position: string }>>([
    { name: "", position: "" },
  ]);

  // 2) Summarization mode (e.g. "summarization" vs. "storyline")
  const [mode, setMode] = useState<"summarization" | "storyline">("summarization");

  // 3) Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Because your code processes files one by one, track the current index
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);

  // 4) Once the route returns the summary, we store it
  const [summaryJson, setSummaryJson] = useState<SummaryJson | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);

  // 5) Store the raw transcript for possible future “approve & save”
  const [currentTranscript, setCurrentTranscript] = useState<any>(null);

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
    const contextStr = lines.join(". ");
    return contextStr ? contextStr + "." : "";
  };

  /**
   * Fetch the JSON transcript from file.downloadUrl
   * If your route is public or you have a separate route, adapt as needed.
   */
  const fetchTranscriptJson = async (downloadUrl: string) => {
    try {
      console.log("Fetching transcript from:", downloadUrl);
      const res = await fetch("/api/fetch-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ downloadUrl }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Error fetching transcript:", error);
      throw new Error(`Failed to fetch transcription: ${error}`);
    }
  };

  /** 
   * Core action: POST transcript + userContext to /api/agents/narrative-summarization
   */
  const handleSummarize = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("No files selected");
      return;
    }

    setIsProcessing(true);
    setProcessingComplete(false);
    setSummaryJson(null);
    setCurrentTranscript(null);

    try {
      // Process a single file at a time
      const file = selectedFiles[currentFileIndex];

      // 1) Fetch the transcript
      const transcriptData = await fetchTranscriptJson(file.downloadUrl);
      if (!Array.isArray(transcriptData?.transcript)) {
        toast.error(`Invalid transcript data for ${file.filename}`);
        return;
      }
      setCurrentTranscript(transcriptData);

      // 2) Build user context from the table
      const userContext = buildUserContext();

      // 3) Construct body payload
      const bodyPayload = {
        fileName: file.filename,
        transcript: transcriptData.transcript,
        userContext, // e.g. "Trent is Father. Amber is Mother."
        mode,        // "summarization" or "storyline"
      };

      // 4) POST to the Summarization API
      const response = await fetch("/api/agents/narrative-summarization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(`Error summarizing ${file.filename}: ${data.error || "Unknown error"}`);
        return;
      }

      const result: SummarizeResponse = await response.json();
      if (!result.success) {
        toast.error(result.error || `Summarization failed for ${file.filename}`);
        return;
      }

      // 5) Store the summary results
      if (result.summaryJson) {
        setSummaryJson(result.summaryJson);
        setProcessingComplete(true);
        toast.success(`Summarization complete for ${file.filename}`);
      } else {
        toast.error("No summary returned from server.");
      }
    } catch (err: any) {
      console.error("Error summarizing transcript:", err);
      toast.error(`Failed to summarize: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * If you want to re-run after adjusting context or switching mode,
   * reset states.
   */
  const handleRerun = () => {
    setProcessingComplete(false);
    setSummaryJson(null);
  };

  /**
   * Approve & Save (optional) - if you want to do the same pattern as IdentifySpeakers:
   * e.g. store the summary in a DB or update the transcript, etc.
   */
  const handleApprove = async () => {
    if (!currentTranscript || !summaryJson) {
      toast.error("No transcript or summary available");
      return;
    }

    setIsSaving(true);

    try {
      const file = selectedFiles[currentFileIndex];

      // In IdentifySpeakers, you unify speakers, update roles/names, etc.
      // Here, you might do something simpler: just store the summary JSON
      // or attach it to the transcript, etc.
      const updatedTranscript = { ...currentTranscript, summaryJson };

      // Example: POST to "/api/save-transcription" or some endpoint
      const saveResponse = await fetch("/api/save-transcription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptionData: updatedTranscript,
          jsonUrl: file.downloadUrl,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save summarization");
      }

      // Optionally open a viewer, or just move to next
      toast.success(`Summary saved for ${file.filename}`);

      if (currentFileIndex < selectedFiles.length - 1) {
        setCurrentFileIndex(currentFileIndex + 1);
        setProcessingComplete(false);
        setSummaryJson(null);
        setCurrentTranscript(null);
      } else {
        // All done
        if (onClose) onClose();
      }
    } catch (err: any) {
      console.error("Error saving summary:", err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-black/20 p-4 rounded-md text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Narrative Summarization</h3>
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
          <span className="font-medium ml-1">
            {selectedFiles[currentFileIndex]?.filename}
          </span>
        </div>
      )}

      {!processingComplete ? (
        <>
          <p className="text-sm mb-3">
            Provide any relevant context below. For example:
            <br />
            <strong>Trent is father.</strong> <strong>Amber is mother.</strong>
          </p>

          {/* Context table (same pattern as IdentifySpeakers) */}
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
                      placeholder="Father, mother, manager, etc."
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

          {/* Mode selection */}
          <div className="mt-4 text-sm">
            <label className="block font-medium mb-1">Mode:</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "summarization" | "storyline")}
              className="bg-gray-800 border border-gray-700 text-white p-1"
            >
              <option value="summarization">Summarization (concise)</option>
              <option value="storyline">Storyline (creative)</option>
            </select>
          </div>

          {/* Summarize button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSummarize}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-2"
            >
              {isProcessing && <FiLoader className="animate-spin" />}
              {isProcessing ? "Summarizing..." : "Summarize"}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Display summarization results */}
          <div className="mb-3">
            <h4 className="text-md font-semibold">Summarization Results</h4>
            {summaryJson ? (
              <pre className="bg-gray-800 p-2 mt-2 text-sm overflow-x-auto">
                {JSON.stringify(summaryJson, null, 2)}
              </pre>
            ) : (
              <p className="text-sm italic">No summary available.</p>
            )}
          </div>

          {/* Rerun or Approve & Save */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleRerun}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Rerun
            </button>
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
