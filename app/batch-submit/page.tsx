"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { FiDownload, FiRefreshCw, FiChevronLeft, FiChevronRight } from "react-icons/fi";

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

export default function BatchSubmitPage() {
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobStatuses, setJobStatuses] = useState<JobStatus[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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

  // Redirect unauthenticated users to login
  if (status === "unauthenticated") {
    redirect("/login");
  }

  // Load transcription results
  const loadTranscriptionResults = useCallback(async (nextToken?: string | null) => {
    if (status !== "authenticated") return;
    
    try {
      setIsLoadingTranscriptions(true);
      setTranscriptionError("");
      
      // Build query parameters
      const params = new URLSearchParams();
      if (nextToken) params.append('continuationToken', nextToken);
      params.append('maxResults', maxResultsPerPage.toString());

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
  }, [status]);

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
    if (status === "authenticated") {
      loadTranscriptionResults();
    }
  }, [status, loadTranscriptionResults]);

  const handleSubmitJobs = async () => {
    setIsSubmitting(true);
    setMessage("Submitting jobs for your audio files...");
    setError("");
    setJobs([]);
    setJobStatuses([]);

    try {
      const res = await fetch("/api/submitJobsForUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error || "Job submission failed");
      }
      
      setJobs(data.jobIds || []);
      setMessage(data.message || "Jobs submitted successfully!");
      
      // Enable auto-refresh by default when jobs are submitted
      setAutoRefresh(true);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setMessage("");
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

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Batch Transcription Jobs</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Submit Jobs Panel */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Submit Jobs for All Audio Files</h2>
          <p className="mb-4 text-gray-300">
            This will scan your S3 input directory and submit a transcription job for each audio file found.
            The results will be saved to your output directory.
          </p>
          
          <button
            onClick={handleSubmitJobs}
            disabled={isSubmitting}
            className={`px-6 py-3 rounded-md font-medium transition-colors ${
              isSubmitting 
                ? "bg-gray-600 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? "Submitting..." : "Submit Transcription Jobs"}
          </button>
          
          {message && (
            <div className="mt-4 bg-green-900/30 border border-green-600 text-green-400 px-4 py-3 rounded">
              {message}
            </div>
          )}
          
          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-600 text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>
        
        {/* Completed Transcriptions Panel */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Completed Transcriptions</h2>
            <button
              onClick={() => loadTranscriptionResults()}
              disabled={isLoadingTranscriptions}
              className={`flex items-center gap-2 px-3 py-1 text-sm rounded ${
                isLoadingTranscriptions
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <FiRefreshCw className={isLoadingTranscriptions ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
          
          {transcriptionError && (
            <div className="mb-4 bg-red-900/30 border border-red-600 text-red-400 px-4 py-3 rounded">
              {transcriptionError}
            </div>
          )}
          
          {getCurrentPageTranscriptions().length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-900 rounded-lg">
                  <thead className="border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">File Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {getCurrentPageTranscriptions().map((file, index) => (
                      <tr key={index} className="hover:bg-gray-800">
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{file.filename}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{formatFileSize(file.size)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {new Date(file.lastModified).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <a 
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
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
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => handlePaginationChange('prev')}
                  disabled={resultsPage <= 1}
                  className={`flex items-center gap-1 px-3 py-1 rounded ${
                    resultsPage <= 1
                      ? "text-gray-500 cursor-not-allowed"
                      : "text-blue-400 hover:text-blue-300"
                  }`}
                >
                  <FiChevronLeft /> Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {resultsPage}
                </span>
                <button
                  onClick={() => handlePaginationChange('next')}
                  disabled={!hasMoreTranscriptions && transcriptions.length <= resultsPage * maxResultsPerPage}
                  className={`flex items-center gap-1 px-3 py-1 rounded ${
                    !hasMoreTranscriptions && transcriptions.length <= resultsPage * maxResultsPerPage
                      ? "text-gray-500 cursor-not-allowed"
                      : "text-blue-400 hover:text-blue-300"
                  }`}
                >
                  Next <FiChevronRight />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {isLoadingTranscriptions ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                "No transcription files found in your output directory."
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Job Status Table */}
      {jobs.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Submitted Jobs</h2>
            <div className="flex items-center space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-300">Auto-refresh (15s)</span>
              </label>
              <button
                onClick={checkJobStatus}
                disabled={isCheckingStatus}
                className={`flex items-center gap-2 px-3 py-1 text-sm rounded ${
                  isCheckingStatus
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <FiRefreshCw className={isCheckingStatus ? "animate-spin" : ""} />
                {isCheckingStatus ? "Refreshing..." : "Refresh Status"}
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-900 rounded-lg">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Job ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {jobs.map((job, index) => {
                  // Find matching status record
                  const statusRecord = jobStatuses.find(status => status.jobId === job.jobId);
                  
                  return (
                    <tr key={index} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{job.fileName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{job.jobId}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {statusRecord ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(statusRecord.status)}`}>
                            {statusRecord.status}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {statusRecord?.reason && (
                          <div className="text-red-400">{statusRecord.reason}</div>
                        )}
                        {statusRecord?.startedAt && (
                          <div className="text-gray-400">
                            Started: {new Date(statusRecord.startedAt).toLocaleString()}
                          </div>
                        )}
                        {statusRecord?.stoppedAt && (
                          <div className="text-gray-400">
                            Completed: {new Date(statusRecord.stoppedAt).toLocaleString()}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <p className="mt-4 text-sm text-gray-400">
            The transcription results will be available in your output directory when jobs are completed.
          </p>
        </div>
      )}
    </div>
  );
} 