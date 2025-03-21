"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { FiLoader, FiX, FiPlus, FiList, FiUser } from "react-icons/fi";

// Minimal shape for a transcription file
interface TranscriptionFile {
  key: string;
  filename: string;
  downloadUrl: string; // URL to JSON transcript
}

// The shape of narrative options returned by the API
interface KeyMoment {
  speaker: string;
  moment: string;
}

interface NarrativeOption {
  title: string;
  approach_description: string;
  key_moments: KeyMoment[];
  suggested_themes: string[];
}

interface StorylineContent {
  narrative_options: NarrativeOption[];
}

interface StorylineJson {
  [key: string]: StorylineContent;
}

// The entire response object from the API
interface StorylineResponse {
  success?: boolean;
  storylineJson?: StorylineJson;
  error?: string;
}

/** 
 * Props:
 *  - selectedFiles: array of transcription files user has selected
 *  - onClose: optional callback if you want to hide this panel
 */
interface StorylineAgentProps {
  selectedFiles: TranscriptionFile[];
  onClose?: () => void;
}

export default function StorylineAgent({
  selectedFiles,
  onClose,
}: StorylineAgentProps) {
  // User context input state
  const [userContext, setUserContext] = useState<string>("");
  
  // Speakers to focus on 
  const [speakers, setSpeakers] = useState<string[]>(['']);
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Process files one at a time
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  
  // Result state
  const [storylineJson, setStorylineJson] = useState<StorylineJson | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  
  // Store the raw transcript for possible future "approve & save"
  const [currentTranscript, setCurrentTranscript] = useState<any>(null);

  /** Handle adding a new speaker input field */
  const handleAddSpeaker = () => {
    setSpeakers([...speakers, '']);
  };

  /** Handle removing a speaker input field */
  const handleRemoveSpeaker = (index: number) => {
    const newSpeakers = [...speakers];
    newSpeakers.splice(index, 1);
    setSpeakers(newSpeakers);
  };

  /** Handle changing a speaker value */
  const handleSpeakerChange = (index: number, value: string) => {
    const newSpeakers = [...speakers];
    newSpeakers[index] = value;
    setSpeakers(newSpeakers);
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
   * Core action: POST transcript to /api/agents/storyline.
   */
  const handleGenerateStoryline = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("No files selected");
      return;
    }

    setIsProcessing(true);
    setProcessingComplete(false);
    setStorylineJson(null);
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

      // 2) Filter out empty speakers
      const validSpeakers = speakers.filter(s => s.trim() !== '');

      // 3) Construct payload
      const bodyPayload = {
        file: file.filename,
        transcript: transcriptData.transcript,
        userContext: userContext.trim(),
        speakers: validSpeakers,
        chunkLimit: 200000,
      };

      // 4) POST to the Storyline API route
      const response = await fetch("/api/agents/storyline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(`Error generating storyline for ${file.filename}: ${data.error || "Unknown error"}`);
        return;
      }

      const result: StorylineResponse = await response.json();
      if (!result.success) {
        toast.error(result.error || `Storyline generation failed for ${file.filename}`);
        return;
      }

      if (result.storylineJson) {
        setStorylineJson(result.storylineJson);
        setProcessingComplete(true);
        toast.success(`Storyline options generated for ${file.filename}`);
      } else {
        toast.error("No storyline content returned from server.");
      }
    } catch (err: any) {
      console.error("Error generating storyline:", err);
      toast.error(`Failed to generate storyline: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reset state to allow rerunning the storyline generation.
   */
  const handleRerun = () => {
    setProcessingComplete(false);
    setStorylineJson(null);
  };

  /**
   * Approve & Save action.
   */
  const handleApprove = async () => {
    if (!currentTranscript || !storylineJson) {
      toast.error("No transcript or storyline content available");
      return;
    }
    setIsSaving(true);
    try {
      const file = selectedFiles[currentFileIndex];
      // Merge the storyline content into the transcript and POST to save
      const updatedTranscript = { 
        ...currentTranscript, 
        storylineJson: storylineJson 
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
        throw new Error("Failed to save storyline");
      }

      toast.success(`Storyline saved for ${file.filename}`);
      if (currentFileIndex < selectedFiles.length - 1) {
        setCurrentFileIndex(currentFileIndex + 1);
        setProcessingComplete(false);
        setStorylineJson(null);
        setCurrentTranscript(null);
      } else {
        if (onClose) onClose();
      }
    } catch (err: any) {
      console.error("Error saving storyline:", err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-black/20 p-4 rounded-md text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Generate Storyline Options</h3>
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
            {/* User Context Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-xs uppercase text-gray-400">
                Context or Goal (Optional)
              </label>
              <textarea
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="Provide context about your goals for this interview or conversation. (e.g., 'This is for a podcast about career transitions')"
                className="bg-gray-800 border border-gray-700 text-white p-2 rounded w-full min-h-[80px]"
              />
              <p className="text-xs text-gray-400 mt-1">
                This helps the AI understand the focus of your narrative
              </p>
            </div>

            {/* Speaker Selection */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-2 text-xs uppercase text-gray-400">
                Focus on Specific Speakers (Optional)
              </label>
              <div className="space-y-2">
                {speakers.map((speaker, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-shrink-0 text-gray-400">
                      <FiUser size={16} />
                    </div>
                    <input
                      type="text"
                      value={speaker}
                      onChange={(e) => handleSpeakerChange(index, e.target.value)}
                      placeholder="Enter speaker name"
                      className="bg-gray-800 border border-gray-700 text-white p-2 rounded w-full"
                    />
                    {speakers.length > 1 && (
                      <button
                        onClick={() => handleRemoveSpeaker(index)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                        title="Remove speaker"
                      >
                        <FiX size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddSpeaker}
                className="mt-2 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-sm flex items-center gap-1"
              >
                <FiPlus size={14} /> Add Speaker
              </button>
              <p className="text-xs text-gray-400 mt-1">
                Leave empty to include all speakers. Add names to focus on specific speakers.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleGenerateStoryline}
              disabled={isProcessing || selectedFiles.length === 0}
              className={`px-4 py-2 rounded text-sm flex items-center gap-2 ${
                isProcessing || selectedFiles.length === 0
                  ? "bg-blue-700/50 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isProcessing && <FiLoader className="animate-spin" />}
              {isProcessing ? "Generating..." : "Generate Storyline Options"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold">Storyline Options</h4>
            <div className="flex gap-2">
              <button
                onClick={handleRerun}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Rerun
              </button>
            </div>
          </div>

          {storylineJson && Object.keys(storylineJson).length > 0 && (
            <div className="space-y-4">
              {Object.entries(storylineJson).map(([filename, content]) => (
                <div key={filename} className="bg-black/30 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                    <h5 className="font-medium text-sm truncate">{filename}</h5>
                  </div>
                  
                  <div className="divide-y divide-gray-700">
                    {content.narrative_options.map((option, optionIndex) => (
                      <div key={optionIndex} className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                            <span className="text-sm font-medium">{optionIndex + 1}</span>
                          </div>
                          <h3 className="text-lg font-medium text-blue-300">{option.title}</h3>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-gray-300">{option.approach_description}</p>
                        </div>
                        
                        {option.key_moments && option.key_moments.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm uppercase text-gray-400 mb-2 font-medium">Key Moments</h4>
                            <ul className="space-y-3">
                              {option.key_moments.map((moment, idx) => (
                                <li key={idx} className="bg-black/30 p-3 rounded-lg border border-gray-800">
                                  <div className="text-xs text-blue-400 mb-1 font-medium">{moment.speaker}</div>
                                  <p className="text-sm text-gray-300">"{moment.moment}"</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {option.suggested_themes && option.suggested_themes.length > 0 && (
                          <div>
                            <h4 className="text-sm uppercase text-gray-400 mb-2 font-medium">Suggested Themes</h4>
                            <div className="flex flex-wrap gap-2">
                              {option.suggested_themes.map((theme, idx) => (
                                <span 
                                  key={idx} 
                                  className="bg-teal-900/40 text-teal-300 px-3 py-1 rounded-full text-sm"
                                >
                                  {theme}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
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
            Analyzing transcript and generating storyline options...
          </p>
        </div>
      )}
    </div>
  );
} 