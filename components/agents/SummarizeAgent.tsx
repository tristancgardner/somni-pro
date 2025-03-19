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
    key_moments: string[];
  };
}

// The entire response object from the API
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

export default function SummarizeAgent({
  selectedFiles,
  onClose,
}: SummarizeNarrativeAgentProps) {
  // 1) Capture user context as rows of "Name" + "Position/Role"
  const [contextRows, setContextRows] = useState<Array<{ name: string; position: string }>>([
    { name: "", position: "" },
  ]);

  // 2) Summarization mode (we support "summarization" or "storyline", but focus on summarization)
  const [mode, setMode] = useState<"summarization" | "storyline">("summarization");

  // 3) Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Process files one at a time
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);

  // 4) Once the route returns the summary, we store it
  const [summaryJson, setSummaryJson] = useState<SummaryJson | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);

  // 5) Store the raw transcript for possible future "approve & save"
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

  /** Build a single user context string, e.g. "Trent is Father. Amber is Mother." */
  const buildUserContext = (): string => {
    const lines = contextRows
      .filter((row) => row.name.trim() && row.position.trim())
      .map((row) => `${row.name} is ${row.position}`);
    const contextStr = lines.join(". ");
    return contextStr ? contextStr + "." : "";
  };

  /**
   * Fetch the JSON transcript from file.downloadUrl.
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
      return await res.json();
    } catch (error: any) {
      console.error("Error fetching transcript:", error);
      throw new Error(`Failed to fetch transcription: ${error.message}`);
    }
  };

  /**
   * Core action: POST transcript + userContext to /api/agents/summarize.
   * Note: The payload key is "file" (not "fileName").
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

      // 2) Build user context from the context table
      const userContext = buildUserContext();

      // 3) Construct payload – note we use "file" instead of "fileName"
      const bodyPayload = {
        file: file.filename,
        transcript: transcriptData.transcript,
        userContext, // e.g. "Trent is Father. Amber is Mother."
        chunkLimit: 200000, // Setting a reasonable chunk limit instead of mode
      };

      // 4) POST to the Summarization API route
      const response = await fetch("/api/agents/summarize", {
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
   * Reset state to allow rerunning the summarization.
   */
  const handleRerun = () => {
    setProcessingComplete(false);
    setSummaryJson(null);
  };

  /**
   * Approve & Save action (optional).
   */
  const handleApprove = async () => {
    if (!currentTranscript || !summaryJson) {
      toast.error("No transcript or summary available");
      return;
    }
    setIsSaving(true);
    try {
      const file = selectedFiles[currentFileIndex];
      // Example: merge the summary into the transcript and POST to save.
      const updatedTranscript = { ...currentTranscript, summaryJson };

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

      toast.success(`Summary saved for ${file.filename}`);
      if (currentFileIndex < selectedFiles.length - 1) {
        setCurrentFileIndex(currentFileIndex + 1);
        setProcessingComplete(false);
        setSummaryJson(null);
        setCurrentTranscript(null);
      } else {
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
        <div className="mb-4 text-sm bg-blue-900/30 p-2 rounded border border-blue-800">
          <div className="flex items-center gap-2">
            <span>Processing:</span>
            <span className="font-medium">{currentFileIndex + 1}</span>
            <span>of</span>
            <span className="font-medium">{selectedFiles.length}</span>
            <span className="mx-1">-</span>
            <span className="font-medium truncate max-w-md">
              {selectedFiles[currentFileIndex]?.filename}
            </span>
          </div>
        </div>
      )}

      {!processingComplete ? (
        <>
          <div className="mb-5 bg-gray-900/50 p-3 rounded border border-gray-700">
            <p className="text-sm mb-3">
              Provide any relevant context about people in the conversation:
            </p>

            <table className="min-w-full text-sm mb-3">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs uppercase text-gray-400">Name</th>
                  <th className="p-2 text-left text-xs uppercase text-gray-400">Position / Role</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {contextRows.map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-800">
                    <td className="p-2">
                      <input
                        value={row.name}
                        onChange={(e) => handleChangeRow(idx, "name", e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-white p-2 w-full rounded"
                        placeholder="Trent"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={row.position}
                        onChange={(e) => handleChangeRow(idx, "position", e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-white p-2 w-full rounded"
                        placeholder="Father, manager, etc."
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
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-sm flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Person
            </button>

            <div className="mt-4 text-sm">
              <label className="block font-medium mb-1 text-xs uppercase text-gray-400">Mode:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "summarization" | "storyline")}
                className="bg-gray-800 border border-gray-700 text-white p-2 rounded w-full md:w-64"
              >
                <option value="summarization">Summarization (concise)</option>
                <option value="storyline">Storyline (creative)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSummarize}
              disabled={isProcessing || selectedFiles.length === 0}
              className={`px-4 py-2 rounded text-sm flex items-center gap-2 ${
                isProcessing || selectedFiles.length === 0
                  ? "bg-blue-700/50 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isProcessing && <FiLoader className="animate-spin" />}
              {isProcessing ? "Summarizing..." : "Generate Summary"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold">Summarization Results</h4>
            <div className="flex gap-2">
              <button
                onClick={handleRerun}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Rerun
              </button>
            </div>
          </div>

          {summaryJson && Object.keys(summaryJson).length > 0 && (
            <div className="space-y-4">
              {Object.entries(summaryJson).map(([filename, content]) => (
                <div key={filename} className="bg-black/30 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                    <h5 className="font-medium text-sm truncate">{filename}</h5>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div>
                      <h6 className="text-xs uppercase text-gray-400 mb-1 font-medium">Summary</h6>
                      <p className="text-sm text-gray-300 bg-black/30 p-3 rounded">{content.summary}</p>
                    </div>
                    
                    {content.key_moments && content.key_moments.length > 0 && (
                      <div>
                        <h6 className="text-xs uppercase text-gray-400 mb-1 font-medium">Key Moments</h6>
                        <ul className="text-sm space-y-2">
                          {content.key_moments.map((moment, idx) => (
                            <li key={idx} className="flex items-start gap-2 bg-black/30 p-3 rounded">
                              <span className="text-blue-400 mt-0.5">•</span>
                              <span className="text-gray-300">{moment}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {content.themes && content.themes.length > 0 && (
                      <div>
                        <h6 className="text-xs uppercase text-gray-400 mb-1 font-medium">Themes</h6>
                        <div className="flex flex-wrap gap-2">
                          {content.themes.map((theme, idx) => (
                            <span 
                              key={idx} 
                              className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded-full"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={handleApprove}
              disabled={isSaving}
              className={`px-4 py-2 rounded text-sm flex items-center gap-2 ${
                isSaving 
                ? "bg-green-700/50 cursor-not-allowed" 
                : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isSaving && <FiLoader className="animate-spin" />}
              {isSaving ? "Saving..." : "Approve & Save"}
            </button>
          </div>
        </>
      )}
      
      {isProcessing && (
        <div className="mt-6">
          <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse"></div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Analyzing transcript and generating summary...
          </p>
        </div>
      )}
    </div>
  );
}
