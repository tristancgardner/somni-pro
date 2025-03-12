"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { FiDownload, FiRefreshCw, FiChevronLeft, FiChevronRight, FiUpload, FiPlay, FiCheck, FiX, FiFileText, FiMic } from "react-icons/fi";
import { v4 as uuidv4 } from 'uuid';
import TranscriptionViewer from '@/components/TranscriptionViewer';
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import Modal from '@/components/Modal';

type JobStatus = {
  jobId: string;
  jobName: string;
  status: string;
  createdAt?: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  exitCode?: number;
  reason?: string;
};

type Project = {
  id: string;
  name: string;
  description?: string;
};

type TranscriptionFile = {
  key: string;
  filename: string;
  size: number;
  lastModified: Date;
  downloadUrl: string;
};

type UploadStatus = {
  filename: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
  location?: string;
};

export default function UploadTestPage() {
  const { data: session, status } = useSession();
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Batch transcription state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobStatuses, setJobStatuses] = useState<JobStatus[]>([]);
  const [jobMessage, setJobMessage] = useState("");
  const [jobError, setJobError] = useState("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Transcription results state
  const [transcriptions, setTranscriptions] = useState<TranscriptionFile[]>([]);
  const [isLoadingTranscriptions, setIsLoadingTranscriptions] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState("");
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [hasMoreTranscriptions, setHasMoreTranscriptions] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);
  const maxResultsPerPage = 10;
  
  // Transcription viewer state
  const [selectedTranscription, setSelectedTranscription] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Project info modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [isListeningForDictation, setIsListeningForDictation] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Generate a sessionId once when the component mounts
  useEffect(() => {
    if (sessionId === "") {
      // Generate a unique session ID (timestamp + uuid)
      const newSessionId = `${Date.now()}-${uuidv4().substring(0, 8)}`;
      setSessionId(newSessionId);
      console.log("Generated session ID:", newSessionId);
    }
  }, [sessionId]);

  // Load transcription results
  const loadTranscriptionResults = useCallback(async (nextToken?: string | null) => {
    if (status !== "authenticated" || !sessionId) return;
    
    try {
      setIsLoadingTranscriptions(true);
      setTranscriptionError("");
      
      // Build query parameters
      const params = new URLSearchParams();
      if (nextToken) params.append('continuationToken', nextToken);
      params.append('maxResults', maxResultsPerPage.toString());
      params.append('sessionId', sessionId);
      
      // Use the user's email and sessionId to construct the prefix
      const userEmail = session?.user?.email || 'unknown@example.com';
      params.append('prefix', `output/${userEmail}/${sessionId}/`);

      const res = await fetch(`/api/list-transcriptions?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to load transcription results");
      }
      
      // If we're fetching with a continuation token, we're adding to the list
      // Otherwise, we're replacing the list
      if (nextToken) {
        setTranscriptions(prev => [...prev, ...data.files]);
      } else {
        setTranscriptions(data.files || []);
      }
      
      setContinuationToken(data.nextContinuationToken || null);
      setHasMoreTranscriptions(data.isTruncated || false);
      
    } catch (err: any) {
      console.error("Error loading transcription results:", err);
      setTranscriptionError(err.message);
    } finally {
      setIsLoadingTranscriptions(false);
    }
  }, [status, session, sessionId]);

  // Page forward/backward for transcription results
  const handlePaginationChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && resultsPage > 1) {
      setResultsPage(prev => prev - 1);
    } else if (direction === 'next' && hasMoreTranscriptions) {
      setResultsPage(prev => prev + 1);
      // If we need more results, load them
      if (transcriptions.length < resultsPage * maxResultsPerPage + maxResultsPerPage && continuationToken) {
        loadTranscriptionResults(continuationToken);
      }
    }
  };

  // Get displayed transcriptions for current page
  const getCurrentPageTranscriptions = () => {
    const startIdx = (resultsPage - 1) * maxResultsPerPage;
    const endIdx = startIdx + maxResultsPerPage;
    return transcriptions.slice(startIdx, endIdx);
  };

  const checkJobStatus = useCallback(async () => {
    if (jobs.length === 0) return;
    
    try {
      setIsCheckingStatus(true);
      
      const jobIds = jobs.map((job) => job.jobId);
      const res = await fetch("/api/checkJobStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to check job status");
      }
      
      setJobStatuses(data.jobs || []);
      
      // If we have jobs that are SUCCEEDED or FAILED, refresh transcription results
      const completedJobs = data.jobs.filter(
        (job: JobStatus) => job.status === 'SUCCEEDED' || job.status === 'FAILED'
      );
      
      if (completedJobs.length > 0) {
        // Refresh transcription list when jobs complete
        loadTranscriptionResults();
      }
    } catch (err: any) {
      console.error("Error checking job status:", err);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [jobs, loadTranscriptionResults]);

  // Set up auto-refresh if enabled
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoRefresh && jobs.length > 0) {
      intervalId = setInterval(() => {
        checkJobStatus();
      }, 15000); // Check every 15 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, jobs, checkJobStatus]);

  // Initial status check after jobs are submitted
  useEffect(() => {
    if (jobs.length > 0) {
      checkJobStatus();
    }
  }, [jobs, checkJobStatus]);

  // Load transcription results on mount
  useEffect(() => {
    if (status === "authenticated" && sessionId) {
      loadTranscriptionResults();
    }
  }, [status, sessionId, loadTranscriptionResults]);

  // Load user's projects
  const loadProjects = useCallback(async () => {
    if (status !== "authenticated") return;
    
    try {
      setIsLoadingProjects(true);
      const res = await fetch('/api/projects');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to load projects");
      }
      
      setProjects(data.projects || []);
      
      // Set default selected project if available
      if (data.projects.length > 0) {
        setSelectedProjectId(data.projects[0].id);
      }
    } catch (err: any) {
      console.error("Error loading projects:", err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [status]);

  // Load projects on mount
  useEffect(() => {
    if (status === "authenticated") {
      loadProjects();
    }
  }, [status, loadProjects]);

  // Handle creating a new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !session?.user?.email) return;
    
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: fileDescription
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to create project");
      }
      
      // Add new project to list and select it
      setProjects(prev => [...prev, data.project]);
      setSelectedProjectId(data.project.id);
      setNewProjectName("");
      setIsCreatingProject(false);
    } catch (err: any) {
      console.error("Error creating project:", err);
    }
  };

  // Handle dictation for the description field
  const handleStartDictation = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Your browser doesn't support speech recognition. Try Chrome.");
      return;
    }
    
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      setIsListeningForDictation(true);
    };
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      
      setFileDescription(transcript);
    };
    
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListeningForDictation(false);
    };
    
    recognition.onend = () => {
      setIsListeningForDictation(false);
    };
    
    recognition.start();
  };

  // Save file information and project association
  const handleSaveProjectInfo = async () => {
    if (!session?.user?.email) return;
    
    try {
      // Determine what we're saving based on context - if this was after file upload or job submission
      const successfulUploads = uploadStatuses
        .filter(status => status.status === 'success' && status.location)
        .map(status => ({
          s3Key: status.location,
          filename: status.filename
        }));
      
      // If we have successful uploads, associate those files
      // Otherwise, just save the project and description for this session
      const payload = {
        sessionId: sessionId,
        projectId: selectedProjectId,
        description: fileDescription
      };
      
      // Only include files if we have successful uploads
      if (successfulUploads.length > 0) {
        Object.assign(payload, { files: successfulUploads });
      }
      
      const res = await fetch('/api/associate-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to save file information");
      }
      
      // Close the modal and reset description
      setShowProjectModal(false);
      setFileDescription("");
      
      // Show confirmation message
      if (successfulUploads.length > 0) {
        setJobMessage("Files associated with project successfully!");
      } else {
        setJobMessage("Project information saved. Files will be associated when processing completes.");
      }
      
    } catch (err: any) {
      console.error("Error saving file information:", err);
      setJobError(`Error saving project information: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setSelectedFiles(fileArray);
      
      // Initialize upload statuses for each file
      setUploadStatuses(
        fileArray.map(file => ({
          filename: file.name,
          status: 'pending'
        }))
      );
      
      // For testing - uncomment this to show the modal immediately after file selection
      // console.log("Showing project modal directly after file selection");
      // setShowProjectModal(true);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !sessionId) {
      return;
    }

    if (!session?.user?.email) {
      return;
    }

    setIsUploading(true);
    
    // Process each file one at a time
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Update status to uploading
      setUploadStatuses(prevStatuses => 
        prevStatuses.map((status, idx) => 
          idx === i ? { ...status, status: 'uploading' } : status
        )
      );
      
      try {
        const formData = new FormData();
        formData.append('testFile', file);
        formData.append('userEmail', session.user.email!);
        formData.append('sessionId', sessionId);

        const res = await fetch('/api/uploadTest', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data?.message || data?.error || 'Upload failed.');
        }
        
        // Update status to success
        setUploadStatuses(prevStatuses => 
          prevStatuses.map((status, idx) => 
            idx === i ? { 
              ...status, 
              status: 'success',
              location: data.location
            } : status
          )
        );
      } catch (err: any) {
        // Update status to error
        setUploadStatuses(prevStatuses => 
          prevStatuses.map((status, idx) => 
            idx === i ? { 
              ...status, 
              status: 'error',
              message: err.message 
            } : status
          )
        );
      }
    }
    
    setIsUploading(false);
    
    // Show the project info modal after uploads are complete
    // Only show if there's at least one successful upload
    const successfulUploads = uploadStatuses.filter(status => status.status === 'success');
    if (successfulUploads.length > 0) {
      console.log("Upload completed successfully. Showing project modal.", successfulUploads);
      setShowProjectModal(true);
    } else {
      console.log("No successful uploads. Not showing project modal.");
    }
  };

  const handleSubmitJobs = async () => {
    if (!session?.user?.email || !sessionId) {
      setJobError("You must be logged in and have a valid session ID");
      return;
    }
    
    setIsSubmitting(true);
    setJobMessage("Submitting transcription jobs for your audio files...");
    setJobError("");
    setJobs([]);
    setJobStatuses([]);

    try {
      const res = await fetch("/api/submitJobsForUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: session.user.email,
          sessionId: sessionId
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error || "Job submission failed");
      }
      
      setJobs(data.jobIds || []);
      setJobMessage(data.message || "Jobs submitted successfully!");
      
      // Enable auto-refresh by default when jobs are submitted
      setAutoRefresh(true);
      
      // Show the project info modal after successful job submission
      console.log("Jobs submitted successfully. Showing project modal.");
      setShowProjectModal(true);
    } catch (err: any) {
      setJobError(`Error: ${err.message}`);
      setJobMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'PENDING':
        return 'bg-yellow-600 text-yellow-100';
      case 'RUNNABLE':
      case 'STARTING':
        return 'bg-blue-600 text-blue-100';
      case 'RUNNING':
        return 'bg-purple-600 text-purple-100';
      case 'SUCCEEDED':
        return 'bg-green-600 text-green-100';
      case 'FAILED':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const viewTranscription = (url: string) => {
    setSelectedTranscription(url);
    setViewerOpen(true);
  };

  // Show appropriate modal based on settings
  const renderModal = () => {
    if (!showProjectModal) return null;
    
    return (
      <Modal show={showProjectModal} onClose={() => setShowProjectModal(false)}>
        <h2 className="text-xl font-semibold mb-4 text-white">
          While we're waiting, tell us about these files
        </h2>
        
        <div className="space-y-4">
          {/* Project selection */}
          <div>
            <label className="block mb-2 text-sm font-bold text-gray-300">
              Select Project
            </label>
            
            {isLoadingProjects ? (
              <div className="flex items-center text-gray-400 text-sm">
                <div className="w-5 h-5 border-t-2 border-r-2 border-blue-400 rounded-full animate-spin mr-2"></div>
                Loading projects...
              </div>
            ) : isCreatingProject ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter new project name"
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className={`px-3 py-2 rounded text-sm ${
                      !newProjectName.trim()
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Create Project
                  </button>
                  <button
                    onClick={() => setIsCreatingProject(false)}
                    className="px-3 py-2 rounded text-sm bg-gray-700 text-white hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex-grow px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  )}
                </select>
                <button
                  onClick={() => setIsCreatingProject(true)}
                  className="px-3 py-2 rounded text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  New Project
                </button>
              </div>
            )}
          </div>
          
          {/* Description input */}
          <div>
            <label className="block mb-2 text-sm font-bold text-gray-300">
              Brief Description
            </label>
            <div className="flex gap-2">
              <textarea
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                placeholder="Give a brief description of the project or files"
                rows={4}
                className="flex-grow px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleStartDictation}
                className={`self-start p-2 rounded ${
                  isListeningForDictation
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
                title="Dictate description"
              >
                <FiMic />
              </button>
            </div>
            {isListeningForDictation && (
              <p className="mt-1 text-sm text-red-400">Listening... speak now</p>
            )}
          </div>
          
          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowProjectModal(false)}
              className="px-4 py-2 rounded text-gray-300 hover:text-white"
            >
              Skip
            </button>
            <button
              onClick={handleSaveProjectInfo}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={isCreatingProject}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  // Show a login message if not authenticated
  if (status === "unauthenticated") {
    return (
      <BackgroundWrapper imagePath="/images/electric_timeline.png">
        <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
          <div className='w-full max-w-7xl mx-auto relative'>
            <PageHeader />
            <div className='p-4 flex flex-col items-center justify-center'>
              <h1 className='text-2xl font-bold mb-4 text-white'>Please Log In</h1>
              <p className="text-gray-300">You must be logged in to use this feature.</p>
            </div>
          </div>
        </main>
      </BackgroundWrapper>
    );
  }

  if (status === "loading") {
    return (
      <BackgroundWrapper imagePath="/images/electric_timeline.png">
        <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
          <div className='w-full max-w-7xl mx-auto relative'>
            <PageHeader />
            <div className='p-4 flex flex-col items-center justify-center'>
              <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-blue-400 border-r-transparent animate-spin"></div>
              <p className="mt-4 text-gray-300">Loading...</p>
            </div>
          </div>
        </main>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper imagePath="/images/electric_timeline.png">
      <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
        <div className='w-full max-w-7xl mx-auto relative'>
          <PageHeader />
          {viewerOpen && selectedTranscription ? (
            /* Transcription Viewer */
            <div className="flex flex-col w-full h-full">
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Transcription Viewer</h2>
                <button 
                  onClick={() => {
                    setViewerOpen(false);
                    setSelectedTranscription(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white"
                >
                  Back to Results
                </button>
              </div>
              <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <TranscriptionViewer jsonUrl={selectedTranscription} />
              </div>
            </div>
          ) : (
            /* Normal Upload and Process Flow */
            <div className="p-4">
              <h1 className='text-2xl font-bold mb-4 text-white'>S3 Upload & Batch Transcription Testing</h1>
              
              {/* Session Info Banner */}
              <div className="bg-black/50 p-4 rounded-lg mb-8 flex justify-between items-center">
                <div>
                  <p className="m-0 text-white">
                    <strong>User:</strong> {session?.user?.email || 'Not logged in'}
                  </p>
                  <p className="m-0 text-sm text-gray-400">
                    <strong>Session ID:</strong> {sessionId}
                  </p>
                </div>
                <div className="p-2 px-4 bg-[#45b7aa]/20 rounded border border-[#45b7aa] text-sm">
                  Files will be processed in {session?.user?.email || 'your'}/{sessionId}/
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* File Upload Panel */}
                <div className="bg-black/50 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold mb-4 text-white">Step 1: Upload Audio Files</h2>
                  <div className="mb-4 text-gray-300">
                    <p>Upload one or more audio files for transcription. If your narrative content was recorded in-camera rather than with a field recorder, please strip the audio from your video files before uploading.</p>
                    
                    {/* Debug button to test modal */}
                    <div className="mt-2 flex gap-2">
                      <button 
                        onClick={() => {
                          console.log("Debug: Manually showing project modal");
                          setShowProjectModal(true);
                        }}
                        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded"
                      >
                        Debug: Test Modal
                      </button>
                    </div>
                    
                    {/* Container wrapper - making them horizontally aligned */}
                    <div className="mt-3 mb-3 flex flex-col md:flex-row gap-4">
                      {/* Allowed file types container */}
                      <div className="p-3 bg-gray-800/50 rounded-md border border-gray-700 flex-shrink-0">
                        <p className="text-sm font-medium mb-1 text-gray-400">Allowed file types:</p>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 bg-indigo-900/60 rounded text-xs">.wav</span>
                          <span className="px-2 py-1 bg-indigo-900/60 rounded text-xs">.mp3</span>
                          <span className="px-2 py-1 bg-indigo-900/60 rounded text-xs">.m4a</span>
                        </div>
                      </div>
                      
                      {/* Sample rate tip */}
                      <div className="p-3 bg-blue-900/20 border-l-4 border-blue-500 text-blue-300 text-sm flex-grow">
                        <p className="font-bold">Tip:</p>
                        <p>For best results, ensure your audio has a sample rate of 16 kHz or greater - 24 kHz recommended.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label 
                      htmlFor="file-upload" 
                      className="block mb-2 font-bold text-white"
                    >
                      Select audio files to upload:
                    </label>
                    <input 
                      id="file-upload"
                      type="file" 
                      accept=".wav,.mp3,.m4a" 
                      onChange={handleFileChange}
                      multiple
                      className="block w-full text-sm text-gray-300
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-violet-50 file:text-violet-700
                        hover:file:bg-violet-100"
                      disabled={isUploading}
                    />
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 text-sm text-gray-400">
                        Selected {selectedFiles.length} file(s) - Total size: {
                          formatFileSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))
                        }
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleUpload}
                    disabled={isUploading || selectedFiles.length === 0}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-md font-bold transition-colors ${
                      isUploading || selectedFiles.length === 0 
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    <FiUpload />
                    {isUploading ? 'Uploading...' : 'Upload Files to S3'}
                  </button>
                  
                  {/* File Upload Status List */}
                  {uploadStatuses.length > 0 && (
                    <div className="mt-6 bg-black/50 rounded-lg max-h-[200px] overflow-y-auto">
                      <table className="w-full border-collapse">
                        <tbody>
                          {uploadStatuses.map((status, index) => (
                            <tr key={index} className="border-b border-gray-800">
                              <td className="py-3 px-4 text-sm text-gray-300 break-all w-3/4">
                                {status.filename}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {status.status === 'pending' && (
                                  <span className="text-gray-400">Pending</span>
                                )}
                                {status.status === 'uploading' && (
                                  <span className="text-blue-400">Uploading...</span>
                                )}
                                {status.status === 'success' && (
                                  <span className="text-green-400 flex items-center justify-end">
                                    <FiCheck className="mr-1" /> Success
                                  </span>
                                )}
                                {status.status === 'error' && (
                                  <span className="text-red-400 flex items-center justify-end">
                                    <FiX className="mr-1" /> Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {/* Batch Transcription Panel */}
                <div className="bg-black/50 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold mb-4 text-white">Step 2: Process All Files</h2>
                  <p className="mb-6 text-gray-400">
                    This will find all audio files in your input directory for this session and submit them for transcription.
                  </p>
                  
                  <button 
                    onClick={handleSubmitJobs}
                    disabled={isSubmitting}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-md font-bold transition-colors ${
                      isSubmitting 
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <FiPlay />
                    {isSubmitting ? 'Submitting...' : 'Submit Transcription Jobs'}
                  </button>
                  
                  {jobMessage && (
                    <div className="mt-6 p-4 rounded bg-green-900/20 border-l-4 border-green-600 text-green-400">
                      <p className="m-0 font-bold">{jobMessage}</p>
                    </div>
                  )}
                  
                  {jobError && (
                    <div className="mt-6 p-4 rounded bg-red-900/20 border-l-4 border-red-600 text-red-400">
                      <p className="m-0 font-bold">{jobError}</p>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white m-0">Job Status</h3>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center cursor-pointer text-sm text-gray-400">
                          <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={() => setAutoRefresh(!autoRefresh)}
                            className="mr-2"
                          />
                          Auto-refresh (15s)
                        </label>
                        <button
                          onClick={checkJobStatus}
                          disabled={isCheckingStatus || jobs.length === 0}
                          className={`flex items-center gap-1 px-3 py-2 rounded text-sm ${
                            isCheckingStatus || jobs.length === 0
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <FiRefreshCw className={isCheckingStatus ? "animate-spin" : ""} />
                          Refresh
                        </button>
                      </div>
                    </div>
                    
                    {jobs.length > 0 ? (
                      <div className="bg-black/50 rounded-lg overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-gray-800">
                              <th className="py-3 px-4 text-left text-xs text-gray-400 uppercase">File</th>
                              <th className="py-3 px-4 text-left text-xs text-gray-400 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jobs.map((job, index) => {
                              const statusRecord = jobStatuses.find(status => status.jobId === job.jobId);
                              const status = statusRecord?.status || 'Unknown';
                              const statusColorClass = getStatusBadgeColor(status);
                              
                              return (
                                <tr key={index} className="border-b border-gray-800">
                                  <td className="py-3 px-4 text-sm text-gray-300">{job.fileName}</td>
                                  <td className="py-3 px-4">
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${statusColorClass}`}>
                                      {status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-400 bg-black/50 rounded-lg">
                        No jobs submitted yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Transcription Results Panel */}
              <div className="mt-8 bg-black/50 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white m-0">Step 3: View Transcriptions</h2>
                  <button
                    onClick={() => loadTranscriptionResults()}
                    disabled={isLoadingTranscriptions}
                    className={`flex items-center gap-2 px-4 py-2 rounded ${
                      isLoadingTranscriptions
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <FiRefreshCw className={isLoadingTranscriptions ? "animate-spin" : ""} />
                    Refresh List
                  </button>
                </div>
                
                {transcriptionError && (
                  <div className="mb-6 p-4 rounded bg-red-900/20 border-l-4 border-red-600 text-red-400">
                    {transcriptionError}
                  </div>
                )}
                
                {getCurrentPageTranscriptions().length > 0 ? (
                  <>
                    <div className="bg-black/50 rounded-lg overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="py-3 px-4 text-left text-xs text-gray-400 uppercase">File Name</th>
                            <th className="py-3 px-4 text-left text-xs text-gray-400 uppercase">Size</th>
                            <th className="py-3 px-4 text-left text-xs text-gray-400 uppercase">Date</th>
                            <th className="py-3 px-4 text-right text-xs text-gray-400 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getCurrentPageTranscriptions().map((file, index) => (
                            <tr key={index} className="border-b border-gray-800">
                              <td className="py-3 px-4 text-sm text-gray-300">{file.filename}</td>
                              <td className="py-3 px-4 text-sm text-gray-300">{formatFileSize(file.size)}</td>
                              <td className="py-3 px-4 text-sm text-gray-300">
                                {new Date(file.lastModified).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-4">
                                  <button
                                    onClick={() => viewTranscription(file.downloadUrl)}
                                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                  >
                                    <FiFileText /> View
                                  </button>
                                  <a 
                                    href={file.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                  >
                                    <FiDownload /> Download
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
                      <button
                        onClick={() => handlePaginationChange('prev')}
                        disabled={resultsPage <= 1}
                        className={`flex items-center gap-1 p-2 ${
                          resultsPage <= 1 ? 'text-gray-600 cursor-not-allowed' : 'text-blue-400 hover:text-blue-300'
                        }`}
                      >
                        <FiChevronLeft /> Previous
                      </button>
                      <span>Page {resultsPage}</span>
                      <button
                        onClick={() => handlePaginationChange('next')}
                        disabled={!hasMoreTranscriptions && transcriptions.length <= resultsPage * maxResultsPerPage}
                        className={`flex items-center gap-1 p-2 ${
                          !hasMoreTranscriptions && transcriptions.length <= resultsPage * maxResultsPerPage
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-blue-400 hover:text-blue-300'
                        }`}
                      >
                        Next <FiChevronRight />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-center text-gray-400 bg-black/50 rounded-lg">
                    {isLoadingTranscriptions ? (
                      <div className="flex justify-center">
                        <div className="w-8 h-8 border-2 border-blue-400 border-r-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      "No transcription files found in your output directory for this session."
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-8 pt-4 border-t border-gray-800 text-sm text-gray-400">
                <p><strong>Testing Flow:</strong></p>
                <ol className="pl-6 list-decimal">
                  <li>Upload audio files using the form in Step 1</li>
                  <li>Click "Submit Transcription Jobs" in Step 2 to process all files</li>
                  <li>Monitor job status in the table below Step 2</li>
                  <li>Once jobs complete, view and download results in Step 3</li>
                </ol>
                <p className="mt-2"><strong>Directory Structure:</strong></p>
                <ul className="pl-6 list-disc">
                  <li>Input files: <code className="bg-black/30 px-1 py-0.5 rounded">s3://{process.env.S3_TRANSCRIBE_BUCKET}/input/{session?.user?.email}/{sessionId}/</code></li>
                  <li>Output files: <code className="bg-black/30 px-1 py-0.5 rounded">s3://{process.env.S3_TRANSCRIBE_BUCKET}/output/{session?.user?.email}/{sessionId}/</code></li>
                </ul>
              </div>
              
              {/* Use the new renderModal function */}
              {renderModal()}
            </div>
          )}
        </div>
      </main>
    </BackgroundWrapper>
  );
} 