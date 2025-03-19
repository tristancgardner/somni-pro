"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { FiLoader, FiX, FiPlus } from "react-icons/fi";

// Minimal shape for a transcription file
interface TranscriptionFile {
  key: string;
  filename: string;
  downloadUrl: string; // URL to JSON transcript
}

// The shape of categorized content returned by the API
interface CategorizedSegment {
  speaker: string;
  summary: string;
}

interface CategorizedContent {
  detected_topics?: string[];
  categorized_segments: {
    [topic: string]: CategorizedSegment[];
  };
}

interface CategorizedJson {
  [key: string]: CategorizedContent;
}

// The entire response object from the API
interface CategorizeResponse {
  success?: boolean;
  categorizedJson?: CategorizedJson;
  error?: string;
}

/** 
 * Props:
 *  - selectedFiles: array of transcription files user has selected
 *  - onClose: optional callback if you want to hide this panel
 */
interface SortDialogAgentProps {
  selectedFiles: TranscriptionFile[];
  onClose?: () => void;
}

export default function SortDialogAgent({
  selectedFiles,
  onClose,
}: SortDialogAgentProps) {
  // Topic management state
  const [topics, setTopics] = useState<string[]>(['']);
  const [isAutoDetect, setIsAutoDetect] = useState<boolean>(true);
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Process files one at a time
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  
  // Result state
  const [categorizedJson, setCategorizedJson] = useState<CategorizedJson | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  
  // Store the raw transcript for possible future "approve & save"
  const [currentTranscript, setCurrentTranscript] = useState<any>(null);

  /** Handle adding a new topic input field */
  const handleAddTopic = () => {
    setTopics([...topics, '']);
  };

  /** Handle removing a topic input field */
  const handleRemoveTopic = (index: number) => {
    const newTopics = [...topics];
    newTopics.splice(index, 1);
    setTopics(newTopics);
  };

  /** Handle changing a topic value */
  const handleTopicChange = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
  };

  /** Toggle between auto-detect and manual topics modes */
  const toggleAutoDetect = () => {
    setIsAutoDetect(!isAutoDetect);
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
   * Core action: POST transcript to /api/agents/categorize.
   */
  const handleCategorize = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("No files selected");
      return;
    }

    // Check if we need topics when not in auto-detect mode
    if (!isAutoDetect) {
      // Filter out empty topics
      const validTopics = topics.filter(t => t.trim() !== '');
      if (validTopics.length === 0) {
        toast.error("Please add at least one topic");
        return;
      }
      setTopics(validTopics);
    }

    setIsProcessing(true);
    setProcessingComplete(false);
    setCategorizedJson(null);
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

      // 2) Construct payload
      const bodyPayload = {
        file: file.filename,
        transcript: transcriptData.transcript,
        topics: isAutoDetect ? [] : topics.filter(t => t.trim() !== ''),
        isAutoDetect: isAutoDetect,
        chunkLimit: 200000,
      };

      // 3) POST to the Categorization API route
      const response = await fetch("/api/agents/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(`Error categorizing ${file.filename}: ${data.error || "Unknown error"}`);
        return;
      }

      const result: CategorizeResponse = await response.json();
      if (!result.success) {
        toast.error(result.error || `Categorization failed for ${file.filename}`);
        return;
      }

      if (result.categorizedJson) {
        setCategorizedJson(result.categorizedJson);
        setProcessingComplete(true);
        toast.success(`Categorization complete for ${file.filename}`);
      } else {
        toast.error("No categorized content returned from server.");
      }
    } catch (err: any) {
      console.error("Error categorizing transcript:", err);
      toast.error(`Failed to categorize: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reset state to allow rerunning the categorization.
   */
  const handleRerun = () => {
    setProcessingComplete(false);
    setCategorizedJson(null);
  };

  /**
   * Approve & Save action.
   */
  const handleApprove = async () => {
    if (!currentTranscript || !categorizedJson) {
      toast.error("No transcript or categorized content available");
      return;
    }
    setIsSaving(true);
    try {
      const file = selectedFiles[currentFileIndex];
      // Merge the categorized content into the transcript and POST to save
      const updatedTranscript = { 
        ...currentTranscript, 
        categorizedJson: categorizedJson 
      };

      const saveResponse = await fetch("/api/save-transcription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptionData: updatedTranscript,
          jsonUrl: file.downloadUrl,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save categorization");
      }

      toast.success(`Categorization saved for ${file.filename}`);
      if (currentFileIndex < selectedFiles.length - 1) {
        setCurrentFileIndex(currentFileIndex + 1);
        setProcessingComplete(false);
        setCategorizedJson(null);
        setCurrentTranscript(null);
      } else {
        if (onClose) onClose();
      }
    } catch (err: any) {
      console.error("Error saving categorization:", err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-black/20 p-4 rounded-md text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sort Dialog by Topics</h3>
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
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={isAutoDetect}
                  onChange={toggleAutoDetect}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                />
                <span className="font-medium">Auto-detect topics</span>
                <span className="text-xs text-gray-400">(AI will identify main topics from the transcript)</span>
              </label>
            </div>

            {!isAutoDetect && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2 text-xs uppercase text-gray-400">
                  Enter Topics to Categorize:
                </label>
                <div className="space-y-2">
                  {topics.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => handleTopicChange(index, e.target.value)}
                        placeholder="Enter a topic (e.g., Budget, Marketing)"
                        className="bg-gray-800 border border-gray-700 text-white p-2 rounded w-full"
                      />
                      {topics.length > 1 && (
                        <button
                          onClick={() => handleRemoveTopic(index)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                          title="Remove topic"
                        >
                          <FiX size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddTopic}
                  className="mt-2 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <FiPlus size={14} /> Add Topic
                </button>
              </div>
            )}
            
            {isAutoDetect && (
              <div className="bg-blue-900/20 p-3 rounded border border-blue-900 text-sm">
                The AI will automatically identify the main topics discussed in the transcript 
                and categorize the conversation around these detected themes.
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleCategorize}
              disabled={isProcessing || selectedFiles.length === 0}
              className={`px-4 py-2 rounded text-sm flex items-center gap-2 ${
                isProcessing || selectedFiles.length === 0
                  ? "bg-blue-700/50 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isProcessing && <FiLoader className="animate-spin" />}
              {isProcessing ? "Categorizing..." : "Categorize Dialog"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold">Categorization Results</h4>
            <div className="flex gap-2">
              <button
                onClick={handleRerun}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Rerun
              </button>
            </div>
          </div>

          {categorizedJson && Object.keys(categorizedJson).length > 0 && (
            <div className="space-y-4">
              {Object.entries(categorizedJson).map(([filename, content]) => (
                <div key={filename} className="bg-black/30 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                    <h5 className="font-medium text-sm truncate">{filename}</h5>
                  </div>
                  
                  <div className="p-4 space-y-5">
                    {/* Auto-detected topics section */}
                    {isAutoDetect && content.detected_topics && content.detected_topics.length > 0 && (
                      <div className="mb-4">
                        <h6 className="text-xs uppercase text-gray-400 mb-2 font-medium">Detected Topics</h6>
                        <div className="flex flex-wrap gap-2">
                          {content.detected_topics.map((topic, idx) => (
                            <span 
                              key={idx} 
                              className="bg-purple-900/40 text-purple-300 px-3 py-1 rounded-full"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Categorized segments section */}
                    {Object.entries(content.categorized_segments).map(([topic, segments]) => (
                      <div key={topic} className="border border-gray-700 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-gray-800/80 border-b border-gray-700">
                          <h6 className="font-medium">{topic}</h6>
                        </div>
                        
                        <div className="p-3">
                          {segments.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No discussion found on this topic</p>
                          ) : (
                            <ul className="space-y-3">
                              {segments.map((segment, idx) => (
                                <li key={idx} className="bg-black/30 p-3 rounded-lg">
                                  <div className="text-xs text-blue-400 mb-1 font-medium">{segment.speaker}</div>
                                  <p className="text-sm text-gray-300">{segment.summary}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
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
            Analyzing transcript and categorizing dialog...
          </p>
        </div>
      )}
    </div>
  );
} 