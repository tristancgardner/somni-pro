"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { FiDownload, FiRefreshCw, FiChevronLeft, FiChevronRight, FiFileText } from "react-icons/fi";
import AudioWaveform from "@/components/custom/diar-plot";
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "@/components/BackgroundWrapper";

type TranscriptionFile = {
  key: string;
  filename: string;
  size: number;
  lastModified: Date;
  downloadUrl: string;
};

export default function TranscribePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isLoaded, setIsLoaded] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [transcription, setTranscription] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    
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

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // View transcription function
    const viewTranscription = (url: string) => {
        router.push(`/transcription-viewer?url=${encodeURIComponent(url)}`);
    };

    // Load transcription results on mount
    useEffect(() => {
        setIsLoaded(true);
        if (status === "authenticated") {
            loadTranscriptionResults();
        }
    }, [status, loadTranscriptionResults]);

    if (status === "loading") {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <BackgroundWrapper imagePath="/images/electric_timeline.png">
            <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
                <div className='w-full max-w-7xl mx-auto relative'>
                    <PageHeader />
                    
                    {/* Completed Transcriptions Panel */}
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Completed Transcriptions</h2>
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
                                    <table className="min-w-full bg-black/70 rounded-lg">
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
                                                <tr key={index} className="hover:bg-gray-800/50">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{file.filename}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{formatFileSize(file.size)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                                        {new Date(file.lastModified).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
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
                    
                    <div className='p-4'>
                        <AudioWaveform />
                    </div>
                </div>
            </main>
        </BackgroundWrapper>
    );
}