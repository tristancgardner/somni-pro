"use client";

import React, { useState } from "react";

// Replace this with your real file interface (key, filename, etc.)
interface SelectedFile {
  fileName: string; // e.g., "Interview_A.json"
}

export default function IdentifySpeakers() {
  // 1) Placeholder list of selected files
  const [selectedFiles] = useState<SelectedFile[]>([
    { fileName: "Interview_A.json" },
    { fileName: "Interview_B.json" },
  ]);

  // 2) Rows for user context: each row has { name, position }
  const [contextRows, setContextRows] = useState<Array<{ name: string; position: string }>>([
    { name: "", position: "" }, // Start with one empty row
  ]);

  // Add a row
  const handleAddRow = () => {
    setContextRows((prev) => [...prev, { name: "", position: "" }]);
  };

  // Remove a row by index
  const handleRemoveRow = (index: number) => {
    setContextRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle changes in the table inputs
  const handleChangeRow = (index: number, field: "name" | "position", value: string) => {
    setContextRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Build userContext as a single string for the agent
  // E.g. "Michael is BDR - talks about customer success stories. Julie is CTO..."
  const buildUserContextString = (): string => {
    const lines = contextRows
      .filter((row) => row.name.trim() && row.position.trim())
      .map((row) => `${row.name} is ${row.position}`);
    // Join with periods or newlines
    return lines.join(". ") + (lines.length > 0 ? "." : "");
  };

  // Call the fetch-transcription route
  // You might pass S3 keys or a URL to it in real usage
  const fetchTranscript = async (fileName: string) => {
    // Example body (adjust for your actual code)
    const res = await fetch("/api/fetch-transcription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonUrl: `https://my-bucket.s3.amazonaws.com/${fileName}` }),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch transcription for ${fileName}`);
    }
    return res.json();
  };

  // Call the identify-speakers route
  const identifySpeakers = async () => {
    // Build the context string
    const userContext = buildUserContextString();
    console.log("User Context:", userContext);

    // For each selected file, fetch transcript, then call identify-speakers
    for (const file of selectedFiles) {
      try {
        const transcriptionData = await fetchTranscript(file.fileName);

        // We expect transcriptionData to have something like: { transcript: [...] }
        if (!transcriptionData?.transcript || !Array.isArray(transcriptionData.transcript)) {
          console.warn(`Invalid transcription structure for file: ${file.fileName}`);
          continue;
        }

        // Now call the IdentifySpeakers route
        const response = await fetch("/api/agents/identify-speakers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.fileName,
            transcript: transcriptionData.transcript, // the array of segments
            userContext, // the combined snippet from the table
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("IdentifySpeakers error:", data);
          continue;
        }

        // The response should have { processedTranscript }
        console.log("IdentifySpeakers result for", file.fileName, data.processedTranscript);
        alert(`IdentifySpeakers completed for ${file.fileName}. Check console for details.`);
      } catch (err) {
        console.error("Error for file:", file.fileName, err);
      }
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-md">
      <h1 className="text-2xl font-bold mb-4">Identify Speakers</h1>

      {/* Selected files list */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Selected Files</h2>
        {selectedFiles.length > 0 ? (
          <ul className="list-disc list-inside text-gray-300">
            {selectedFiles.map((file) => (
              <li key={file.fileName}>{file.fileName}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No files selected.</p>
        )}
      </div>

      {/* Speaker context table */}
      <h2 className="text-lg font-semibold mb-2">Speaker Context</h2>
      <p className="text-sm text-gray-400 mb-4">
        For each known speaker, fill out:
        <br />
        <strong>Name</strong> (e.g. “Michael”) in the first column, and
        <br />
        <strong>Context / Position</strong> (e.g. “BDR - talks about customer success stories”) in the second column.
      </p>

      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border border-gray-700 text-sm">
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
                    placeholder="e.g. BDR - talks about success stories"
                    value={row.position}
                    onChange={(e) => handleChangeRow(index, "position", e.target.value)}
                  />
                </td>
                <td className="px-3 py-2 text-center align-middle">
                  {index > 0 && (
                    <button
                      onClick={() => handleRemoveRow(index)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-sm text-white rounded"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Row Button */}
      <button
        onClick={handleAddRow}
        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded text-white text-sm mb-6"
      >
        + Add another speaker
      </button>

      {/* Identify Speakers Button */}
      <div>
        <button
          onClick={identifySpeakers}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
        >
          Identify Speakers
        </button>
      </div>
    </div>
  );
}
