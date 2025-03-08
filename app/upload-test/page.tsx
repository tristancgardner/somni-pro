"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { FiDownload, FiRefreshCw, FiChevronLeft, FiChevronRight, FiUpload, FiPlay, FiCheck, FiX } from "react-icons/fi";
import { v4 as uuidv4 } from 'uuid';

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

  // Show a login message if not authenticated
  if (status === "unauthenticated") {
    return (
      <main style={{ 
        padding: '2rem', 
        color: '#ffffff', 
        backgroundColor: '#121212', 
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <h1 style={{ color: '#ffffff', marginBottom: '2rem' }}>Please Log In</h1>
        <p>You must be logged in to use this feature.</p>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main style={{ 
        padding: '2rem', 
        color: '#ffffff', 
        backgroundColor: '#121212', 
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          width: '3rem', 
          height: '3rem', 
          borderRadius: '9999px', 
          borderTop: '3px solid #60a5fa', 
          borderRight: '3px solid transparent', 
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem' }}>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ 
      padding: '2rem', 
      color: '#ffffff', 
      backgroundColor: '#121212', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#ffffff', marginBottom: '1rem' }}>S3 Upload & Batch Transcription Testing</h1>
      
      <div style={{ 
        backgroundColor: 'rgba(255,255,255,0.05)', 
        padding: '1rem', 
        borderRadius: '0.5rem', 
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <p style={{ margin: 0 }}>
            <strong>User:</strong> {session?.user?.email || 'Not logged in'}
          </p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#aaa' }}>
            <strong>Session ID:</strong> {sessionId}
          </p>
        </div>
        <div style={{ 
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(69, 183, 170, 0.2)',
          borderRadius: '0.25rem',
          border: '1px solid #45b7aa',
          fontSize: '0.875rem'
        }}>
          Files will be processed in {session?.user?.email || 'your'}/{sessionId}/
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* File Upload Panel */}
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: '2rem', 
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Step 1: Upload Audio Files</h2>
          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="file-upload" 
              style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}
            >
              Select one or more .wav files to upload:
            </label>
            <input 
              id="file-upload"
              type="file" 
              accept=".wav,.mp3,.m4a" 
              onChange={handleFileChange}
              multiple
              style={{ 
                color: '#ffffff', 
                background: 'transparent',
                width: '100%',
                padding: '0.5rem 0'
              }}
              disabled={isUploading}
            />
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#aaa' }}>
                Selected {selectedFiles.length} file(s) - Total size: {
                  formatFileSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))
                }
              </div>
            )}
          </div>
          
          <button 
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: isUploading ? '#6b7280' : '#4f46e5', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.25rem',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'background-color 0.2s ease',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <FiUpload />
            {isUploading ? 'Uploading...' : 'Upload Files to S3'}
          </button>
          
          {/* File Upload Status List */}
          {uploadStatuses.length > 0 && (
            <div style={{ 
              marginTop: '1.5rem',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '0.5rem',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {uploadStatuses.map((status, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', width: '75%', wordBreak: 'break-all' }}>
                        {status.filename}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {status.status === 'pending' && (
                          <span style={{ color: '#9CA3AF' }}>Pending</span>
                        )}
                        {status.status === 'uploading' && (
                          <span style={{ color: '#3B82F6' }}>Uploading...</span>
                        )}
                        {status.status === 'success' && (
                          <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <FiCheck style={{ marginRight: '4px' }} /> Success
                          </span>
                        )}
                        {status.status === 'error' && (
                          <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <FiX style={{ marginRight: '4px' }} /> Error
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
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: '2rem', 
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Step 2: Process All Files</h2>
          <p style={{ marginBottom: '1.5rem', color: '#aaa' }}>
            This will find all audio files in your input directory for this session and submit them for transcription.
          </p>
          
          <button 
            onClick={handleSubmitJobs}
            disabled={isSubmitting}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: isSubmitting ? '#6b7280' : '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.25rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'background-color 0.2s ease',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <FiPlay />
            {isSubmitting ? 'Submitting...' : 'Submit Transcription Jobs'}
          </button>
          
          {jobMessage && (
            <div style={{ 
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '0.25rem',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderLeft: '4px solid #10b981',
              color: '#34d399'
            }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>
                {jobMessage}
              </p>
            </div>
          )}
          
          {jobError && (
            <div style={{ 
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '0.25rem',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              borderLeft: '4px solid #dc2626',
              color: '#f87171'
            }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>
                {jobError}
              </p>
            </div>
          )}
          
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Job Status</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#aaa' }}>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={() => setAutoRefresh(!autoRefresh)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Auto-refresh (15s)
                </label>
                <button
                  onClick={checkJobStatus}
                  disabled={isCheckingStatus || jobs.length === 0}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: isCheckingStatus ? '#6b7280' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    cursor: isCheckingStatus || jobs.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <FiRefreshCw className={isCheckingStatus ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>
            
            {jobs.length > 0 ? (
              <div style={{ overflowX: 'auto', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase' }}>File</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job, index) => {
                      const statusRecord = jobStatuses.find(status => status.jobId === job.jobId);
                      const status = statusRecord?.status || 'Unknown';
                      const statusColorClass = getStatusBadgeColor(status);
                      
                      return (
                        <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{job.fileName}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ 
                              display: 'inline-block',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              backgroundColor: statusColorClass.split(' ')[0].replace('bg-', ''),
                              color: statusColorClass.split(' ')[1].replace('text-', '')
                            }}>
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
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#aaa', 
                backgroundColor: 'rgba(0,0,0,0.2)', 
                borderRadius: '0.5rem'
              }}>
                No jobs submitted yet
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Transcription Results Panel */}
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        padding: '2rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Step 3: View Transcriptions</h2>
          <button
            onClick={() => loadTranscriptionResults()}
            disabled={isLoadingTranscriptions}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: isLoadingTranscriptions ? '#6b7280' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: isLoadingTranscriptions ? 'not-allowed' : 'pointer'
            }}
          >
            <FiRefreshCw className={isLoadingTranscriptions ? "animate-spin" : ""} />
            Refresh List
          </button>
        </div>
        
        {transcriptionError && (
          <div style={{ 
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '0.25rem',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderLeft: '4px solid #dc2626',
            color: '#f87171'
          }}>
            {transcriptionError}
          </div>
        )}
        
        {getCurrentPageTranscriptions().length > 0 ? (
          <>
            <div style={{ overflowX: 'auto', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase' }}>File Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase' }}>Size</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentPageTranscriptions().map((file, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{file.filename}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{formatFileSize(file.size)}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        {new Date(file.lastModified).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <a 
                          href={file.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.25rem',
                            color: '#60a5fa',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '0.875rem'
                          }}
                        >
                          <FiDownload /> Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '1rem',
              color: '#aaa',
              fontSize: '0.875rem'
            }}>
              <button
                onClick={() => handlePaginationChange('prev')}
                disabled={resultsPage <= 1}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem',
                  padding: '0.5rem',
                  color: resultsPage <= 1 ? '#6b7280' : '#60a5fa',
                  background: 'none',
                  border: 'none',
                  cursor: resultsPage <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <FiChevronLeft /> Previous
              </button>
              <span>Page {resultsPage}</span>
              <button
                onClick={() => handlePaginationChange('next')}
                disabled={!hasMoreTranscriptions && transcriptions.length <= resultsPage * maxResultsPerPage}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem',
                  padding: '0.5rem',
                  color: !hasMoreTranscriptions && transcriptions.length <= resultsPage * maxResultsPerPage ? '#6b7280' : '#60a5fa',
                  background: 'none',
                  border: 'none',
                  cursor: !hasMoreTranscriptions && transcriptions.length <= resultsPage * maxResultsPerPage ? 'not-allowed' : 'pointer'
                }}
              >
                Next <FiChevronRight />
              </button>
            </div>
          </>
        ) : (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center', 
            color: '#aaa', 
            backgroundColor: 'rgba(0,0,0,0.2)', 
            borderRadius: '0.5rem'
          }}>
            {isLoadingTranscriptions ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ 
                  width: '2rem', 
                  height: '2rem', 
                  borderRadius: '9999px', 
                  borderTop: '2px solid #60a5fa', 
                  borderRight: '2px solid transparent', 
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            ) : (
              "No transcription files found in your output directory for this session."
            )}
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', color: '#aaa', fontSize: '0.875rem' }}>
        <p><strong>Testing Flow:</strong></p>
        <ol style={{ paddingLeft: '1.5rem' }}>
          <li>Upload audio files using the form in Step 1</li>
          <li>Click "Submit Transcription Jobs" in Step 2 to process all files</li>
          <li>Monitor job status in the table below Step 2</li>
          <li>Once jobs complete, view and download results in Step 3</li>
        </ol>
        <p><strong>Directory Structure:</strong></p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Input files: <code>s3://{process.env.S3_TRANSCRIBE_BUCKET}/input/{session?.user?.email}/{sessionId}/</code></li>
          <li>Output files: <code>s3://{process.env.S3_TRANSCRIBE_BUCKET}/output/{session?.user?.email}/{sessionId}/</code></li>
        </ul>
      </div>
    </main>
  );
} 