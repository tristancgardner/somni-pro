"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { FiLoader } from "react-icons/fi";

interface TranscriptionFile {
  key: string;         // S3 key
  filename: string;
  downloadUrl: string; // URL to JSON transcript
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

    // For each file, fetch transcript, then call the agent
    for (const file of selectedFiles) {
      try {
        const transcriptData = await fetchTranscriptJson(file.downloadUrl);
        if (!Array.isArray(transcriptData?.transcript)) {
          toast.error(`Invalid transcript data for ${file.filename}`);
          continue;
        }

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
          continue;
        }

        // Now data.processedTranscript has the updated speaker labels
        console.log("IdentifySpeakers result:", file.filename, data.processedTranscript);
        toast.success(`IdentifySpeakers done for ${file.filename}! Check console.`);
      } catch (err: any) {
        console.error("Error identifying speakers:", file.filename, err);
        toast.error(`Failed for ${file.filename}`);
      }
    }

    setIsProcessing(false);
  };

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
    </div>
  );
}
