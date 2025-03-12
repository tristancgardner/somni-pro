"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { FiDownload, FiRefreshCw, FiChevronLeft, FiChevronRight, FiFileText, FiFolderPlus, FiFolder, FiEdit2, FiDelete, FiPlus, FiUsers, FiFileText as FiSummarize, FiList, FiLoader, FiCheck, FiAlertCircle, FiColumns, FiTrash2 } from "react-icons/fi";
import { FiChevronDown } from "react-icons/fi";
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "../../components/BackgroundWrapper";
import IdentifySpeakersAgent from "@/components/agents/IdentifySpeakersAgent"; 
import { toast } from 'react-hot-toast';

type ProjectFile = {
  id: string;
  s3Key: string;
  filename: string;
  size: number;
  lastModified: Date;
  projectId: string | null;
  projectName: string | null;
}

type TranscriptionFile = {
  key: string;
  filename: string;
  size: number;
  lastModified: Date;
  downloadUrl: string;
  projectId: string | null;
  projectName: string | null;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    files: number;
  };
};

export default function TranscribePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
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

    // Project state
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectDescription, setNewProjectDescription] = useState("");
    const [showEditProjectModal, setShowEditProjectModal] = useState(false);
    const [isSubmittingProject, setIsSubmittingProject] = useState(false);
    const [projectError, setProjectError] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [selectedFileKey, setSelectedFileKey] = useState<string | null>(null);

    // Model selection state
    const [selectedModel, setSelectedModel] = useState<string>("o1");
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);

    // Agent state
    const [activeAgent, setActiveAgent] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // Add a ref to track if we've already processed the URL parameters
    const projectFromUrlProcessed = useRef(false);

    // Add new state variables for speaker identification
    const [speakerMode, setSpeakerMode] = useState<'role_based' | 'context_based'>('context_based');
    const [intervieweeNames, setIntervieweeNames] = useState<string>('');
    const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [processingMessage, setProcessingMessage] = useState<string>('');
    const [numSpeakers, setNumSpeakers] = useState<number | null>(null);
    const [generateLabels, setGenerateLabels] = useState<boolean>(false);

    // Add the selected transcription state
    const [selectedTranscription, setSelectedTranscription] = useState<TranscriptionFile | null>(null);

    // File selection within a project
    const [projectSelectedFiles, setProjectSelectedFiles] = useState<string[]>([]);

    // DEPRECATED: This function is no longer used since we migrated to the IdentifySpeakersAgent component
    // It's kept for reference in case we need to revert or understand the old logic
    const runSpeakerIdentification = async () => {
        if (!activeAgent) return;
        
        // Ensure we have a selected file to process
        if (!selectedTranscription) {
            toast.error('Please select a transcription file first');
            return;
        }
        
        setIsProcessing(true);
        
        try {
            // Fetch the transcription data
            const response = await fetch(selectedTranscription.downloadUrl);
            if (!response.ok) {
                throw new Error('Failed to load transcription data');
            }
            
            const transcriptionData = await response.json();
            
            // Check if we have a valid transcript structure
            if (!transcriptionData.transcript || !Array.isArray(transcriptionData.transcript)) {
                throw new Error('Invalid transcription format');
            }
            
            // Call our API endpoint
            const result = await fetch('/api/identify-speakers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transcript: transcriptionData.transcript,
                    mode: speakerMode,
                    numSpeakers,
                    generateLabels
                }),
            });
            
            const data = await result.json();
            
            if (!result.ok) {
                throw new Error(data.error || 'Failed to process transcript');
            }
            
            // Update the transcription with identified speakers
            transcriptionData.transcript = data.result.updatedTranscript;
            
            // Create a new Blob with the updated transcription
            const blob = new Blob([JSON.stringify(transcriptionData, null, 2)], {
                type: 'application/json',
            });
            
            // Generate a download URL for the updated file
            const url = URL.createObjectURL(blob);
            
            // Trigger download with updated filename
            const a = document.createElement('a');
            const originalName = selectedTranscription.filename;
            const newName = originalName.replace('.json', '_with_speakers.json');
            
            a.href = url;
            a.download = newName;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast.success('Speaker identification completed successfully!');
        } catch (error: any) {
            console.error('Speaker identification error:', error);
            toast.error(error.message || 'Failed to identify speakers');
        } finally {
            setIsProcessing(false);
        }
    };

    // Update your view function to set the selected transcription
    const viewTranscription = (url: string, file: TranscriptionFile) => {
        setSelectedTranscription(file);
        router.push(`/transcription-viewer?url=${encodeURIComponent(url)}`);
    };

    // Redirect unauthenticated users to login
    if (status === "unauthenticated") {
        redirect("/login");
    }

    // Load transcription results - modify this to accept an optional project parameter
    const loadTranscriptionResults = useCallback(async (nextToken?: string | null, projectOverride?: Project | null) => {
        if (status !== "authenticated") return;
        
        try {
            setIsLoadingTranscriptions(true);
            setTranscriptionError("");
            
            // Build query parameters
            const params = new URLSearchParams();
            if (nextToken) params.append('continuationToken', nextToken);
            params.append('maxResults', maxResultsPerPage.toString());
            
            // Use the project override if provided, otherwise use the state
            const projectToUse = projectOverride !== undefined ? projectOverride : selectedProject;
            
            // If we have a selected project, filter by it
            if (projectToUse) {
                params.append('projectId', projectToUse.id);
            }

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
    }, [status, selectedProject, maxResultsPerPage]);

    // Load projects
    const loadProjects = useCallback(async () => {
        if (status !== "authenticated") return;
        
        try {
            setIsLoadingProjects(true);
            setProjectError("");
            
            console.log("Attempting to load projects...");
            const res = await fetch('/api/projects', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            });
            
            console.log("Response status:", res.status);
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || "Failed to load projects");
            }
            
            setProjects(data.projects || []);
            console.log("Successfully loaded projects:", data.projects?.length || 0);
        } catch (err: any) {
            console.error("Error loading projects:", err);
            setProjectError(err.message);
            
            // If we receive a 404 error, it might be because the route hasn't been registered yet
            // Let's wait a bit and retry once
            if (err.message.includes("Failed to load projects")) {
                setTimeout(() => {
                    console.log("Retrying project loading after error...");
                    setProjectError("Retrying...");
                    fetch('/api/projects', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        cache: 'no-store',
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.projects) {
                            setProjects(data.projects);
                            setProjectError("");
                            console.log("Retry successful, loaded projects:", data.projects.length);
                        }
                    })
                    .catch(retryErr => {
                        console.error("Retry error:", retryErr);
                        setProjectError("Could not load projects. Please refresh the page.");
                    })
                    .finally(() => {
                        setIsLoadingProjects(false);
                    });
                }, 2000);
                return;
            }
        } finally {
            setIsLoadingProjects(false);
        }
    }, [status]);

    // Create a new project
    const handleCreateProject = async () => {
        if (!newProjectName.trim()) {
            setProjectError("Project name is required");
            return;
        }
        
        try {
            setIsSubmittingProject(true);
            setProjectError("");
            
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProjectName.trim(),
                    description: newProjectDescription.trim() || undefined,
                }),
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || "Failed to create project");
            }
            
            // Reset form and close modal
            setNewProjectName("");
            setNewProjectDescription("");
            setShowNewProjectModal(false);
            
            // Reload projects
            await loadProjects();
        } catch (err: any) {
            console.error("Error creating project:", err);
            setProjectError(err.message);
        } finally {
            setIsSubmittingProject(false);
        }
    };

    // Update project
    const handleUpdateProject = async () => {
        if (!selectedProject) return;
        if (!newProjectName.trim()) {
            setProjectError("Project name is required");
            return;
        }
        
        try {
            setIsSubmittingProject(true);
            setProjectError("");
            
            const res = await fetch(`/api/projects/${selectedProject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProjectName.trim(),
                    description: newProjectDescription.trim() || undefined,
                }),
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || "Failed to update project");
            }
            
            // Reset form and close modal
            setNewProjectName("");
            setNewProjectDescription("");
            setShowEditProjectModal(false);
            
            // Reload projects and update selected project
            await loadProjects();
            
            // Update the selected project with new data
            setSelectedProject({
                ...selectedProject,
                name: newProjectName.trim(),
                description: newProjectDescription.trim() || null,
            });
            
        } catch (err: any) {
            console.error("Error updating project:", err);
            setProjectError(err.message);
        } finally {
            setIsSubmittingProject(false);
        }
    };

    // Delete project
    const handleDeleteProject = async () => {
        if (!selectedProject) return;
        
        if (!confirm(`Are you sure you want to delete the project "${selectedProject.name}"? This will not delete the files, only the project.`)) {
            return;
        }
        
        try {
            const res = await fetch(`/api/projects/${selectedProject.id}`, {
                method: 'DELETE',
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to delete project");
            }
            
            // Reset selected project and reload projects
            setSelectedProject(null);
            await loadProjects();
            await loadTranscriptionResults();
            
        } catch (err: any) {
            console.error("Error deleting project:", err);
            setProjectError(err.message);
        }
    };

    // Add files to project
    const handleAddFilesToProject = async () => {
        if (!selectedProject || selectedFiles.length === 0) return;
        
        try {
            const res = await fetch(`/api/projects/${selectedProject.id}/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileKeys: selectedFiles,
                }),
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || "Failed to add files to project");
            }
            
            // Clear selection and reload data
            setSelectedFiles([]);
            await loadTranscriptionResults();
            
        } catch (err: any) {
            console.error("Error adding files to project:", err);
            setProjectError(err.message);
        }
    };

    // Remove file from project
    const handleRemoveFileFromProject = async (fileId: string) => {
        if (!selectedProject) return;
        
        try {
            const res = await fetch(`/api/projects/${selectedProject.id}/files`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId,
                }),
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to remove file from project");
            }
            
            // Reload data
            await loadTranscriptionResults();
            
        } catch (err: any) {
            console.error("Error removing file from project:", err);
            setProjectError(err.message);
        }
    };

    // Edit project
    const handleEditProject = (project: Project) => {
        setSelectedProject(project);
        setNewProjectName(project.name);
        setNewProjectDescription(project.description || "");
        setShowEditProjectModal(true);
    };

    // Update the select project function to pass the project directly
    const handleSelectProject = useCallback(async (project: Project | null) => {
        setSelectedProject(project);
        setResultsPage(1);
        setContinuationToken(null);
        
        // Pass the project directly to ensure we use the correct value immediately
        if (!isLoadingTranscriptions) {
            await loadTranscriptionResults(null, project);
        }
    }, [loadTranscriptionResults, isLoadingTranscriptions]);

    // Update the file selection handler to work with both general and project-specific selections
    const handleFileSelection = (key: string) => {
        if (selectedProject) {
            // For project view, use projectSelectedFiles
            if (projectSelectedFiles.includes(key)) {
                setProjectSelectedFiles(prev => prev.filter(fileKey => fileKey !== key));
            } else {
                setProjectSelectedFiles(prev => [...prev, key]);
            }
        } else {
            // For general view, use selectedFiles (original behavior)
            if (selectedFiles.includes(key)) {
                setSelectedFiles(prev => prev.filter(fileKey => fileKey !== key));
            } else {
                setSelectedFiles(prev => [...prev, key]);
            }
        }
    };

    // Function to clear all selected files in the current view
    const clearSelectedFiles = () => {
        if (selectedProject) {
            setProjectSelectedFiles([]);
        } else {
            setSelectedFiles([]);
        }
    };

    // Function to select all files in the current view
    const selectAllFiles = () => {
        const currentFiles = getCurrentPageTranscriptions();
        if (selectedProject) {
            setProjectSelectedFiles(currentFiles.map(file => file.key));
        } else {
            setSelectedFiles(currentFiles.map(file => file.key));
        }
    };

    // Function to view all selected files in a project
    const viewAllProjectFiles = () => {
        if (!selectedProject) return;
        
        let filesToView: string[];
        
        // If specific files are selected, use those
        if (projectSelectedFiles.length > 0) {
            filesToView = projectSelectedFiles;
            console.log(`Using ${filesToView.length} selected files`);
        } 
        // Otherwise, get all files from the current project in the current view
        else {
            filesToView = getCurrentPageTranscriptions()
                .filter(file => file.projectId === selectedProject.id)
                .map(file => file.key);
                
            console.log(`Using ${filesToView.length} files from current page`);
                
            // If there are no files in the current view, don't proceed
            if (filesToView.length === 0) {
                toast.error('No files found in this project');
                return;
            }
        }
        
        // Encode the file keys and project ID to pass as URL parameters
        // Only pass the first 20 files to avoid URL length issues
        const fileKeysToUse = filesToView.slice(0, 20);
        
        if (fileKeysToUse.length < filesToView.length) {
            toast(`Viewing the first ${fileKeysToUse.length} files out of ${filesToView.length} total`, {
                icon: '🔍',
                duration: 4000,
            });
        }
        
        // Use direct encoding by replacing @ with %40 - this is safer than URL encoding
        const cleanFileKeys = fileKeysToUse.map(key => key.replace(/@/g, '%40'));
        console.log('File keys for URL:', cleanFileKeys);
        
        // Use JSON.stringify with the cleaned keys
        const fileKeysParam = encodeURIComponent(JSON.stringify(cleanFileKeys));
        const projectIdParam = encodeURIComponent(selectedProject.id);
        
        // Build and log the URL for debugging
        const url = `/transcription-viewer?projectId=${projectIdParam}&fileKeys=${fileKeysParam}`;
        console.log('Navigating to URL:', url);
        
        // Navigate to transcription viewer with parameters
        router.push(url);
    };

    // Page forward/backward for transcription results
    const handlePaginationChange = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && resultsPage > 1) {
            setResultsPage(prev => prev - 1);
        } else if (direction === 'next' && hasMoreTranscriptions) {
            setResultsPage(prev => prev + 1);
            // If we need more results, load them
            if (transcriptions.length < resultsPage * maxResultsPerPage + maxResultsPerPage && continuationToken) {
                loadTranscriptionResults(continuationToken, selectedProject);
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

    // Load transcription results and projects on mount
    useEffect(() => {
        setIsLoaded(true);
        if (status === "authenticated") {
            loadTranscriptionResults(null, selectedProject);
            loadProjects();
        }
    }, [status, loadTranscriptionResults, loadProjects, selectedProject]);

    // Handle projectId from URL
    useEffect(() => {
        const autoSelectProject = async () => {
            if (status === "authenticated" && projects.length > 0 && !projectFromUrlProcessed.current) {
                const projectIdFromUrl = searchParams.get('projectId');
                if (projectIdFromUrl) {
                    const project = projects.find(p => p.id === projectIdFromUrl);
                    if (project) {
                        await handleSelectProject(project);
                    }
                }
                projectFromUrlProcessed.current = true;
            }
        };
        
        autoSelectProject();
    }, [status, projects, searchParams]);

    // Define the toggleAgent function (if it doesn't exist)
    const toggleAgent = (agentName: string) => {
        if (activeAgent === agentName) {
            setActiveAgent(null);
            // Reset processing state when closing
            setProcessingStatus('idle');
            setProcessingMessage('');
        } else {
            setActiveAgent(agentName);
        }
    };

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
                    
                    {/* Project Management Section */}
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Project Management</h2>
                            <button
                                onClick={() => setShowNewProjectModal(true)}
                                className="flex items-center gap-2 px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-700"
                            >
                                <FiFolderPlus /> Create Project
                            </button>
                        </div>
                        
                        {projectError && (
                            <div className="mb-4 bg-red-900/30 border border-red-600 text-red-400 px-4 py-3 rounded">
                                {projectError}
                            </div>
                        )}
                        
                        <div className="flex flex-wrap gap-3 mb-4">
                            <button
                                onClick={() => handleSelectProject(null)}
                                className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
                                    selectedProject === null
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : "bg-black/30 hover:bg-black/50 border border-gray-700"
                                }`}
                            >
                                <FiFolder /> All Files
                            </button>
                            
                            {projects.map(project => (
                                <div
                                    key={project.id}
                                    onClick={() => handleSelectProject(project)}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded group relative transition-colors cursor-pointer ${
                                        selectedProject?.id === project.id 
                                        ? "bg-blue-700/40"
                                        : "bg-black/40 hover:bg-black/60"
                                    }`}
                                >
                                    <FiFolder />
                                    {project.name}
                                    {project._count && (
                                        <span className="ml-1 bg-black/50 px-1.5 rounded-full text-xs">
                                            {project._count.files}
                                        </span>
                                    )}
                                    
                                    {/* Edit/Delete buttons on hover */}
                                    <div className={`absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-2 ${
                                        selectedProject?.id === project.id
                                        ? "opacity-100"
                                        : "opacity-0 group-hover:opacity-100"
                                    } transition-opacity`}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditProject(project);
                                            }}
                                            className="p-1 text-blue-400 hover:text-blue-300"
                                        >
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteProject();
                                            }}
                                            className="p-1 text-red-400 hover:text-red-300"
                                        >
                                            <FiDelete size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Selected Files Actions */}
                    {selectedFiles.length > 0 && !selectedProject && (
                        <div className="bg-black/70 border border-blue-500 rounded-lg p-4 mb-4 flex justify-between items-center">
                            <div className="text-blue-400">
                                <span className="mr-2">{selectedFiles.length} files selected</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedFiles([])}
                                    className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <div className="relative group">
                                    <div
                                        className="px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-700 flex items-center gap-1 cursor-pointer"
                                    >
                                        <FiFolderPlus /> Add to Project
                                    </div>
                                    
                                    {/* Project dropdown */}
                                    <div className="absolute right-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                        {projects.length > 0 ? (
                                            projects.map(project => (
                                                <div
                                                    key={project.id}
                                                    onClick={() => {
                                                        setSelectedProject(project);
                                                        handleAddFilesToProject();
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <FiFolder size={14} /> {project.name}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-2 text-sm text-gray-400">
                                                No projects available
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Selected Files Within Project Actions */}
                    {projectSelectedFiles.length > 0 && selectedProject && (
                        <div className="bg-black/70 border border-green-500 rounded-lg p-4 mb-4 flex justify-between items-center">
                            <div className="text-green-400">
                                <span className="mr-2">{projectSelectedFiles.length} files selected from {selectedProject.name}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setProjectSelectedFiles([])}
                                    className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={viewAllProjectFiles}
                                    className="px-3 py-1 text-sm rounded bg-green-600 hover:bg-green-700 flex items-center gap-1"
                                >
                                    <FiColumns /> View Selected
                                </button>
                                <button
                                    onClick={() => {
                                        projectSelectedFiles.forEach(fileKey => handleRemoveFileFromProject(fileKey));
                                        setProjectSelectedFiles([]);
                                    }}
                                    className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-700 flex items-center gap-1"
                                >
                                    <FiTrash2 /> Remove From Project
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Completed Transcriptions Panel */}
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">
                                {selectedProject ? `Project: ${selectedProject.name}` : "Transcription Library"}
                                {selectedProject?.description && (
                                    <p className="text-sm font-normal text-gray-400 mt-1">
                                        {selectedProject.description}
                                    </p>
                                )}
                            </h2>
                            <div className="flex items-center gap-2">
                                {selectedProject && (
                                    <button
                                        onClick={viewAllProjectFiles}
                                        className="flex items-center gap-2 px-3 py-1 text-sm rounded bg-green-600 hover:bg-green-700"
                                    >
                                        <FiColumns />
                                        {projectSelectedFiles.length > 0 
                                            ? `View Selected (${projectSelectedFiles.length})` 
                                            : "View All Files"}
                                    </button>
                                )}
                                <button
                                    onClick={() => loadTranscriptionResults(null, selectedProject)}
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
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-10">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={(selectedProject ? projectSelectedFiles : selectedFiles).length === getCurrentPageTranscriptions().length && getCurrentPageTranscriptions().length > 0}
                                                            onChange={() => {
                                                                if ((selectedProject ? projectSelectedFiles : selectedFiles).length === getCurrentPageTranscriptions().length) {
                                                                    clearSelectedFiles();
                                                                } else {
                                                                    selectAllFiles();
                                                                }
                                                            }}
                                                            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                                                        />
                                                        <span className="sr-only">Select All</span>
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">File Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Project</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                            {getCurrentPageTranscriptions().map((file, index) => (
                                                <tr key={index} className="hover:bg-gray-800/50">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProject 
                                                                ? projectSelectedFiles.includes(file.key) 
                                                                : selectedFiles.includes(file.key)}
                                                            onChange={() => handleFileSelection(file.key)}
                                                            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{file.filename}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{formatFileSize(file.size)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                                        {new Date(file.lastModified).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                                        {file.projectName ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-300">
                                                                {file.projectName}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500">None</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                                        <div className="flex items-center justify-end gap-4">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    viewTranscription(file.downloadUrl, file);
                                                                }}
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
                                                            {selectedProject && file.projectId === selectedProject.id && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveFileFromProject(file.key);
                                                                    }}
                                                                    className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                                                                >
                                                                    <FiDelete /> Remove
                                                                </button>
                                                            )}
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
                                    selectedProject ? 
                                    "No files found in this project. Add files to get started." :
                                    "No transcription files found in your output directory."
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* New Project Modal */}
                    {showNewProjectModal && (
                        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                            <div className="bg-gray-900 rounded-lg w-full max-w-md p-6">
                                <h3 className="text-xl font-semibold mb-4">Create New Project</h3>
                                
                                {projectError && (
                                    <div className="mb-4 bg-red-900/30 border border-red-600 text-red-400 px-4 py-2 rounded text-sm">
                                        {projectError}
                                    </div>
                                )}
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Project Name</label>
                                    <input
                                        type="text"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                                        placeholder="Enter project name"
                                    />
                                </div>
                                
                                <div className="mb-6">
                                    <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                    <textarea
                                        value={newProjectDescription}
                                        onChange={(e) => setNewProjectDescription(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                                        placeholder="Enter project description"
                                        rows={3}
                                    />
                                </div>
                                
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowNewProjectModal(false)}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateProject}
                                        disabled={isSubmittingProject}
                                        className={`px-4 py-2 rounded flex items-center gap-2 ${
                                            isSubmittingProject
                                            ? "bg-blue-700 cursor-not-allowed"
                                            : "bg-blue-600 hover:bg-blue-700"
                                        }`}
                                    >
                                        {isSubmittingProject && (
                                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                        )}
                                        Create Project
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Edit Project Modal */}
                    {showEditProjectModal && (
                        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                            <div className="bg-gray-900 rounded-lg w-full max-w-md p-6">
                                <h3 className="text-xl font-semibold mb-4">Edit Project</h3>
                                
                                {projectError && (
                                    <div className="mb-4 bg-red-900/30 border border-red-600 text-red-400 px-4 py-2 rounded text-sm">
                                        {projectError}
                                    </div>
                                )}
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Project Name</label>
                                    <input
                                        type="text"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                                        placeholder="Enter project name"
                                    />
                                </div>
                                
                                <div className="mb-6">
                                    <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                    <textarea
                                        value={newProjectDescription}
                                        onChange={(e) => setNewProjectDescription(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                                        placeholder="Enter project description"
                                        rows={3}
                                    />
                                </div>
                                
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowEditProjectModal(false)}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateProject}
                                        disabled={isSubmittingProject}
                                        className={`px-4 py-2 rounded flex items-center gap-2 ${
                                            isSubmittingProject
                                            ? "bg-blue-700 cursor-not-allowed"
                                            : "bg-blue-600 hover:bg-blue-700"
                                        }`}
                                    >
                                        {isSubmittingProject && (
                                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                        )}
                                        Update Project
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Agents Section */}
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Agents</h2>
                        </div>
                        
                        <div className="flex flex-wrap justify-between items-center">
                            {/* Agent Buttons */}
                            <div className="flex flex-wrap gap-3">
                                <button 
                                    className={`flex items-center gap-2 px-4 py-2 rounded text-white transition-colors ${
                                        activeAgent === 'identify-speakers' 
                                        ? 'bg-blue-700 ring-2 ring-blue-400' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                    onClick={() => toggleAgent('identify-speakers')}
                                >
                                    <FiUsers /> Identify Speakers
                                </button>
                                <button 
                                    className={`flex items-center gap-2 px-4 py-2 rounded text-white transition-colors ${
                                        activeAgent === 'summarize' 
                                        ? 'bg-blue-700 ring-2 ring-blue-400' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                    onClick={() => toggleAgent('summarize')}
                                >
                                    <FiSummarize /> Summarize
                                </button>
                                <button 
                                    className={`flex items-center gap-2 px-4 py-2 rounded text-white transition-colors ${
                                        activeAgent === 'sort-dialog' 
                                        ? 'bg-blue-700 ring-2 ring-blue-400' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                    onClick={() => toggleAgent('sort-dialog')}
                                >
                                    <FiList /> Sort Dialog
                                </button>
                            </div>
                            
                            {/* Model Selection Dropdown */}
                            <div className="relative mt-4 sm:mt-0">
                                <div className="text-sm text-gray-400 mb-1">Model</div>
                                <button
                                    className="flex items-center justify-between gap-2 px-3 py-2 bg-black/30 border border-gray-700 rounded min-w-[140px]"
                                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                >
                                    <span>{selectedModel}</span>
                                    <FiChevronDown className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {isModelDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full bg-gray-900 border border-gray-700 rounded-md shadow-lg">
                                        <ul>
                                            <li
                                                className="px-4 py-2 hover:bg-gray-800 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedModel("4o");
                                                    setIsModelDropdownOpen(false);
                                                }}
                                            >
                                                o1
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Expanded Agent Content */}
                        {activeAgent === 'identify-speakers' && (
                            <div className="mt-4 p-4 bg-black/20 backdrop-blur-sm rounded-xl">
                                <p className="text-sm mb-4">
                                    This agent analyzes dialog to identify different speakers or personas, even if you don't provide names.
                                </p>

                                <IdentifySpeakersAgent
                                    selectedFiles={
                                        // Case 1: We have a directly selected transcription
                                        selectedTranscription ? [selectedTranscription] :
                                        // Case 2: We're in a project and have project-specific selections
                                        // Case 3: Otherwise, use the general selectedFiles
                                        (selectedProject && projectSelectedFiles.length > 0 
                                            ? projectSelectedFiles 
                                            : selectedFiles).map((fileKey) => {
                                                const match = transcriptions.find(t => t.key === fileKey);
                                                return match
                                                    ? {
                                                        key: match.key,
                                                        filename: match.filename,
                                                        downloadUrl: match.downloadUrl
                                                    }
                                                    : null;
                                            }).filter(Boolean) as TranscriptionFile[]
                                    }
                                    onClose={() => setActiveAgent(null)}
                                />
                            </div>
                        )}
                        
                        {activeAgent === 'summarize' && (
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <div className="mb-4">
                                    <h3 className="text-lg font-medium text-white mb-2">Summarize</h3>
                                    <p className="text-gray-400">
                                        This agent will generate a summary of your audio transcription.
                                    </p>
                                </div>
                                
                                <div className="flex justify-end gap-3">
                                    <button
                                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
                                        onClick={() => setActiveAgent(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                                    >
                                        Run Agent
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {activeAgent === 'sort-dialog' && (
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <div className="mb-4">
                                    <h3 className="text-lg font-medium text-white mb-2">Sort Dialog</h3>
                                    <p className="text-gray-400">
                                        This agent will organize and sort your audio dialog by speaker.
                                    </p>
                                </div>
                                
                                <div className="flex justify-end gap-3">
                                    <button
                                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
                                        onClick={() => setActiveAgent(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                                    >
                                        Run Agent
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* <div className='p-4'>
                        <AudioWaveform />
                    </div> */}
                </div>
            </main>
        </BackgroundWrapper>
    );
}