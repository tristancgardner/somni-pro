"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { FiDownload, FiRefreshCw, FiChevronLeft, FiChevronRight, FiFileText, FiFolderPlus, FiFolder, FiEdit2, FiDelete, FiPlus, FiUsers, FiFileText as FiSummarize, FiList, FiLoader, FiCheck, FiAlertCircle, FiColumns, FiTrash2, FiMoreVertical, FiMenu, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
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
    
    // Add sidebar state
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
    
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
    const [activeAgent, setActiveAgent] = useState<'identify-speakers' | 'summarize' | 'sort-dialog' | null>(null);
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

    // Add state for file deletion confirmation
    const [showDeleteFileModal, setShowDeleteFileModal] = useState<boolean>(false);
    const [filesToDelete, setFilesToDelete] = useState<string[]>([]);
    const [fileDeleteName, setFileDeleteName] = useState<string>('');
    
    // Add the selected transcription state
    const [selectedTranscription, setSelectedTranscription] = useState<TranscriptionFile | null>(null);

    // File selection within a project
    const [projectSelectedFiles, setProjectSelectedFiles] = useState<string[]>([]);

    // Add new state variables for the delete confirmation modal
    const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    
    // Add state for the project menu dropdown
    const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);

    // Add a ref to track if we've loaded transcriptions for the current project
    const currentProjectRef = useRef<string | null>(null);

    // Add state for reconnecting files by browsing all user files
    const [showReconnectFilesModal, setShowReconnectFilesModal] = useState(false);
    const [availableFiles, setAvailableFiles] = useState<TranscriptionFile[]>([]);
    const [selectedFilesToAdd, setSelectedFilesToAdd] = useState<string[]>([]);
    const [isLoadingAvailableFiles, setIsLoadingAvailableFiles] = useState(false);
    const [reconnectStatus, setReconnectStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [reconnectMessage, setReconnectMessage] = useState<string>("");
    const [fileSearchTerm, setFileSearchTerm] = useState<string>("");
    const [fileListPage, setFileListPage] = useState(1);
    const filesPerPage = 10;

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
        if (status !== "authenticated" || isLoadingTranscriptions) return;
        
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
            // Add a small delay before setting loading to false to prevent UI flicker
            setTimeout(() => {
                setIsLoadingTranscriptions(false);
            }, 300);
        }
    }, [status, selectedProject, maxResultsPerPage, isLoadingTranscriptions]);

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
            
            const projectName = newProjectName.trim();
            const projectDescription = newProjectDescription.trim() || null;
            
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: projectName,
                    description: projectDescription || undefined,
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
            
            // Select the newly created project
            if (data.project) {
                await handleSelectProject(data.project);
                toast.success(`Project "${projectName}" created successfully`);
            } else {
                toast.success("Project created successfully");
            }
            
        } catch (err: any) {
            console.error("Error creating project:", err);
            setProjectError(err.message);
            toast.error("Failed to create project: " + err.message);
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
            
            // Save original values to determine what changed
            const originalName = selectedProject.name;
            const originalDescription = selectedProject.description || "";
            const newName = newProjectName.trim();
            const newDescription = newProjectDescription.trim() || null;
            
            const res = await fetch(`/api/projects/${selectedProject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    description: newDescription || undefined,
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
            
            // Reload projects
            await loadProjects();
            
            // Update the selected project with new data
            setSelectedProject({
                ...selectedProject,
                name: newName,
                description: newDescription,
            });
            
            // Provide feedback on what was updated
            if (originalName !== newName && originalDescription !== newDescription) {
                toast.success("Project name and description updated");
            } else if (originalName !== newName) {
                toast.success("Project name updated");
            } else if (originalDescription !== newDescription) {
                toast.success("Project description updated");
            } else {
                toast.success("Project updated");
            }
            
        } catch (err: any) {
            console.error("Error updating project:", err);
            setProjectError(err.message);
            toast.error("Failed to update project: " + err.message);
        } finally {
            setIsSubmittingProject(false);
        }
    };

    // Delete project
    const handleDeleteProject = async () => {
        if (!projectToDelete) return;
        
        // Check if confirmation text matches "permanently delete"
        if (deleteConfirmText.toLowerCase() !== "permanently delete") {
            setProjectError("Please type 'permanently delete' to confirm");
            return;
        }
        
        try {
            const res = await fetch(`/api/projects/${projectToDelete.id}`, {
                method: 'DELETE',
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to delete project");
            }
            
            // Close the modal and reset
            setShowDeleteProjectModal(false);
            setDeleteConfirmText("");
            setProjectToDelete(null);
            
            // Reload projects list
            await loadProjects();
            
            // If the deleted project was the selected one, select another project
            if (selectedProject?.id === projectToDelete.id) {
                // Find all remaining projects after deletion
                const remainingProjects = projects.filter(p => p.id !== projectToDelete.id);
                
                if (remainingProjects.length > 0) {
                    // Select the first available project
                    await handleSelectProject(remainingProjects[0]);
                } else {
                    // No projects left, reset selected project
                    setSelectedProject(null);
                }
            }
            
            toast.success("Project deleted successfully");
            
        } catch (err: any) {
            console.error("Error deleting project:", err);
            setProjectError(err.message);
        }
    };
    
    // Show delete project confirmation modal
    const showDeleteConfirmation = (project: Project) => {
        setProjectToDelete(project);
        setDeleteConfirmText("");
        setProjectError("");
        setShowDeleteProjectModal(true);
    };

    // Delete file completely
    const handleDeleteFile = async (fileKey?: string) => {
        // If fileKey is provided, we're deleting a single file; otherwise, use the filesToDelete array
        const keysToDelete = fileKey ? [fileKey] : filesToDelete;
        
        if (keysToDelete.length === 0) return;
        
        try {
            // For single files, show a loading toast
            if (keysToDelete.length === 1) {
                toast.loading("Deleting file...");
            } else {
                toast.loading(`Deleting ${keysToDelete.length} files...`);
            }
            
            // Process all selected files
            for (const key of keysToDelete) {
                console.log(`Attempting to delete file: ${key}`);
                
                const res = await fetch(`/api/files/${encodeURIComponent(key)}`, {
                    method: 'DELETE',
                });
                
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.message || "Failed to delete file");
                }
                
                // Remove file from selections if it was selected
                if (selectedFiles.includes(key)) {
                    setSelectedFiles(prev => prev.filter(k => k !== key));
                }
                if (projectSelectedFiles.includes(key)) {
                    setProjectSelectedFiles(prev => prev.filter(k => k !== key));
                }
            }
            
            // Show success message
            toast.dismiss();
            if (keysToDelete.length === 1) {
                toast.success("File deleted successfully");
            } else {
                toast.success(`${keysToDelete.length} files deleted successfully`);
            }
            
            // Close the modal and clear the state
            setShowDeleteFileModal(false);
            setFilesToDelete([]);
            setFileDeleteName('');
            
            // Reload transcription list
            await loadTranscriptionResults();
            
        } catch (err: any) {
            console.error("Error deleting file:", err);
            toast.dismiss();
            toast.error(`Failed to delete file: ${err.message || "Unknown error"}`);
        }
    };
    
    // Initiate file deletion process
    const initiateDeleteFile = (fileKey: string, fileName: string) => {
        setFilesToDelete([fileKey]);
        setFileDeleteName(fileName);
        setShowDeleteFileModal(true);
    };
    
    // Initiate bulk file deletion
    const initiateDeleteFiles = () => {
        const filesToDelete = selectedProject ? projectSelectedFiles : selectedFiles;
        
        if (filesToDelete.length === 0) {
            toast.error("No files selected for deletion");
            return;
        }
        
        setFilesToDelete(filesToDelete);
        setFileDeleteName(''); // Multiple files
        setShowDeleteFileModal(true);
    };

    // Add files to project
    const handleAddFilesToProject = async (projectIdToUse?: string) => {
        // Use the passed project ID if available, otherwise use the selectedProject
        const effectiveProjectId = projectIdToUse || (selectedProject?.id);
        
        if (!effectiveProjectId || selectedFiles.length === 0) {
            toast.error("No project or files selected");
            return;
        }
        
        toast.loading("Adding files to project...");
        
        try {
            const res = await fetch(`/api/projects/${effectiveProjectId}/files`, {
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
            
            // Find the project name for the success message
            const projectName = projects.find(p => p.id === effectiveProjectId)?.name || "project";
            toast.success(`Added ${selectedFiles.length} file(s) to ${projectName}`);
            
            // If this was from the dropdown, set the project as selected
            if (projectIdToUse && (!selectedProject || selectedProject.id !== projectIdToUse)) {
                const project = projects.find(p => p.id === projectIdToUse);
                if (project) {
                    setSelectedProject(project);
                }
            }
            
            await loadTranscriptionResults();
        } catch (err: any) {
            console.error("Error adding files to project:", err);
            setProjectError(err.message);
            toast.error(`Failed to add files: ${err.message}`);
        } finally {
            toast.dismiss();
        }
    };

    // Remove file from project
    const handleRemoveFileFromProject = async (fileKey: string) => {
        if (!selectedProject) return;
        
        try {
            // Find the file object to verify it exists
            const fileToRemove = transcriptions.find((file: TranscriptionFile) => file.key === fileKey);
            
            if (!fileToRemove) {
                toast.error(`File not found for removal. Key: ${fileKey}`);
                return;
            }
            
            // Use the file key directly
            const res = await fetch(`/api/projects/${selectedProject.id}/files/remove-by-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileKey: fileKey,
                }),
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to remove file from project");
            }
            
            toast.success("File removed from project successfully");
            
            // Reload data
            await loadTranscriptionResults();
            
        } catch (err: any) {
            console.error("Error removing file from project:", err);
            toast.error(`Failed to remove file: ${err.message}`);
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
        // Don't allow setting project to null - we always want a project selected
        if (project !== null) {
            // Only update if the project has changed
            if (!selectedProject || selectedProject.id !== project.id) {
                setSelectedProject(project);
                setResultsPage(1);
                setContinuationToken(null);
                currentProjectRef.current = project.id;
                
                // Pass the project directly to ensure we use the correct value immediately
                if (!isLoadingTranscriptions) {
                    await loadTranscriptionResults(null, project);
                }
            }
        }
    }, [loadTranscriptionResults, isLoadingTranscriptions, selectedProject]);

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
            // Just load projects once on mount
            loadProjects();
        }
    }, [status, loadProjects]);
    
    // Handle project selection after projects are loaded
    useEffect(() => {
        if (status === "authenticated" && projects.length > 0 && !selectedProject) {
            // Auto-select the first project if no project is selected
            handleSelectProject(projects[0]);
        }
    }, [status, projects, selectedProject, handleSelectProject]);
    
    // Load transcriptions when selected project changes
    useEffect(() => {
        // Only load if:
        // 1. We have a selected project
        // 2. We're not already loading transcriptions
        // 3. The project has changed since last load
        if (selectedProject && !isLoadingTranscriptions && currentProjectRef.current !== selectedProject.id) {
            currentProjectRef.current = selectedProject.id;
            loadTranscriptionResults(null, selectedProject);
        }
    }, [selectedProject, isLoadingTranscriptions, loadTranscriptionResults]);

    // Handle projectId from URL
    useEffect(() => {
        const autoSelectProject = async () => {
            if (status === "authenticated" && projects.length > 0 && !projectFromUrlProcessed.current && !selectedProject) {
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
    }, [status, projects, searchParams, handleSelectProject, selectedProject]);

    // Define the toggleAgent function (if it doesn't exist)
    const toggleAgent = (agentName: 'identify-speakers' | 'summarize' | 'sort-dialog') => {
        if (activeAgent === agentName) {
            setActiveAgent(null);
            // Reset processing state when closing
            setProcessingStatus('idle');
            setProcessingMessage('');
        } else {
            setActiveAgent(agentName);
        }
    };

    // Create a debounced refresh handler
    const handleRefreshClick = useCallback(() => {
        if (isLoadingTranscriptions) return;
        loadTranscriptionResults(null, selectedProject);
    }, [loadTranscriptionResults, selectedProject, isLoadingTranscriptions]);

    // Add function to handle loading all available files from the user's output folder
    const loadAllAvailableFiles = async () => {
        try {
            setIsLoadingAvailableFiles(true);
            setReconnectStatus('loading');
            setReconnectMessage("Loading all available files...");
            
            // Call the API to get all files (without sessionId filter)
            const res = await fetch(`/api/list-transcriptions?maxResults=1000`);
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || "Failed to load available files");
            }
            
            // Filter out files that are already in the current project
            const currentProjectId = selectedProject?.id;
            let filesNotInProject = data.files || [];
            
            if (currentProjectId) {
                filesNotInProject = data.files.filter((file: TranscriptionFile) => 
                    file.projectId !== currentProjectId
                );
            }
            
            setAvailableFiles(filesNotInProject);
            
            if (filesNotInProject.length === 0) {
                setReconnectStatus('error');
                setReconnectMessage("No additional files found that aren't already in this project.");
            } else {
                setReconnectStatus('idle');
                setReconnectMessage("");
            }
            
        } catch (err: any) {
            console.error("Error loading available files:", err);
            setReconnectStatus('error');
            setReconnectMessage(err.message || "Failed to load available files");
        } finally {
            setIsLoadingAvailableFiles(false);
        }
    };
    
    // Add function to handle file selection for adding to project
    const toggleFileSelection = (fileKey: string) => {
        setSelectedFilesToAdd(prevSelected => 
            prevSelected.includes(fileKey)
                ? prevSelected.filter(key => key !== fileKey)
                : [...prevSelected, fileKey]
        );
    };
    
    // Add function to select all/none files
    const handleSelectAllFiles = (selectAll: boolean) => {
        if (selectAll) {
            const filteredFiles = getFilteredFiles();
            setSelectedFilesToAdd(filteredFiles.map(file => file.key));
        } else {
            setSelectedFilesToAdd([]);
        }
    };
    
    // Add function to filter available files based on search term
    const getFilteredFiles = () => {
        if (!fileSearchTerm.trim()) {
            return availableFiles;
        }
        
        const searchTermLower = fileSearchTerm.toLowerCase();
        return availableFiles.filter(file => 
            file.filename.toLowerCase().includes(searchTermLower) ||
            (file.projectName && file.projectName.toLowerCase().includes(searchTermLower))
        );
    };
    
    // Add function to get files for current page
    const getCurrentPageFiles = () => {
        const filteredFiles = getFilteredFiles();
        const startIndex = (fileListPage - 1) * filesPerPage;
        return filteredFiles.slice(startIndex, startIndex + filesPerPage);
    };
    
    // Add function to handle reconnecting files to the current project
    const handleAddFilesToCurrentProject = async () => {
        if (!selectedProject?.id || selectedFilesToAdd.length === 0) {
            setReconnectStatus('error');
            setReconnectMessage("Please select files to add to this project");
            return;
        }
        
        try {
            setReconnectStatus('loading');
            setReconnectMessage(`Adding ${selectedFilesToAdd.length} files to project...`);
            
            // Format the files for the API
            const filesToAdd = availableFiles
                .filter(file => selectedFilesToAdd.includes(file.key))
                .map(file => ({
                    s3Key: file.key,
                    filename: file.filename
                }));
                
            // Call the API to associate files with the project
            const res = await fetch(`/api/projects/${selectedProject.id}/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileKeys: selectedFilesToAdd,
                }),
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || "Failed to add files to project");
            }
            
            // Success! Update UI and reload files
            setReconnectStatus('success');
            setReconnectMessage(`Successfully added ${selectedFilesToAdd.length} files to the project`);
            
            // Reload transcription list
            await loadTranscriptionResults();
            
            // Close modal after a delay
            setTimeout(() => {
                setShowReconnectFilesModal(false);
                setSelectedFilesToAdd([]);
                setFileSearchTerm("");
                setFileListPage(1);
                setReconnectStatus('idle');
                setReconnectMessage("");
                toast.success(`Added ${selectedFilesToAdd.length} files to project "${selectedProject.name}"`);
            }, 2000);
            
        } catch (err: any) {
            console.error("Error adding files to project:", err);
            setReconnectStatus('error');
            setReconnectMessage(err.message || "Failed to add files to project");
        }
    };

    // Replace the session-based reconnect function with the new one
    const openReconnectFilesModal = async () => {
        setShowReconnectFilesModal(true);
        setSelectedFilesToAdd([]);
        setFileSearchTerm("");
        setFileListPage(1);
        await loadAllAvailableFiles();
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
            {/* Page Header at the top */}
            <PageHeader />
            
            <main className='flex min-h-screen pt-4'>
                {/* Projects Sidebar (Collapsible) */}
                <div 
                    className={`bg-black/70 flex flex-col overflow-y-auto border-r border-gray-800 transition-all duration-300 ease-in-out ${
                        isSidebarExpanded ? "w-80" : "w-16"
                    }`}
                >
                    <div className="sticky top-0 z-10 bg-black/80 py-3 px-4 flex items-center justify-between border-b border-gray-800">
                        {isSidebarExpanded ? (
                            <h2 className="text-xl font-semibold text-white">Projects</h2>
                        ) : (
                            <FiFolder className="mx-auto text-white text-xl" />
                        )}
                        
                        <button
                            onClick={() => setIsSidebarExpanded(prev => !prev)}
                            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
                        >
                            {isSidebarExpanded ? <FiChevronsLeft /> : <FiChevronsRight />}
                        </button>
                    </div>
                    
                    <div className="flex-1 p-4">
                        {isSidebarExpanded && (
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-base font-medium text-gray-300">My Projects</h3>
                                <button
                                    onClick={() => setShowNewProjectModal(true)}
                                    className="flex items-center gap-2 p-1.5 rounded-full bg-blue-600 hover:bg-blue-700"
                                    title="Create Project"
                                >
                                    <FiPlus />
                                </button>
                            </div>
                        )}
                        
                        {!isSidebarExpanded && (
                            <div className="flex justify-center mb-6">
                                <button
                                    onClick={() => setShowNewProjectModal(true)}
                                    className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-700"
                                    title="Create Project"
                                >
                                    <FiPlus />
                                </button>
                            </div>
                        )}
                    
                        {projectError && isSidebarExpanded && (
                            <div className="mb-4 bg-red-900/30 border border-red-600 text-red-400 px-4 py-3 rounded text-sm">
                                {projectError}
                            </div>
                        )}
                        
                        {isLoadingProjects ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : projects.length === 0 ? (
                            isSidebarExpanded ? (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    No projects found. Create your first project to get started.
                                </div>
                            ) : null
                        ) : (
                            <div className="space-y-3">
                                {projects.map(project => (
                                    <div
                                        key={project.id}
                                        onClick={() => handleSelectProject(project)}
                                        className={`flex items-center p-3 text-base rounded-lg group relative transition-colors cursor-pointer ${
                                            selectedProject?.id === project.id 
                                            ? "bg-blue-700/60"
                                            : "bg-black/40 hover:bg-black/60"
                                        }`}
                                    >
                                        <FiFolder className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-3' : 'mx-auto'}`} />
                                        
                                        {isSidebarExpanded && (
                                            <>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="font-medium">{project.name}</div>
                                                    {project.description && (
                                                        <div className="text-xs text-gray-400 truncate">
                                                            {project.description}
                                                        </div>
                                                    )}
                                                </div>
                                                {project._count && (
                                                    <span className="ml-1 bg-black/50 px-1.5 rounded-full text-xs">
                                                        {project._count.files}
                                                    </span>
                                                )}
                                                
                                                {/* 3-dot menu */}
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Toggle dropdown for this project
                                                            const currentMenuOpen = projectMenuOpen === project.id ? null : project.id;
                                                            setProjectMenuOpen(currentMenuOpen);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-gray-200 rounded-full hover:bg-black/40"
                                                    >
                                                        <FiMoreVertical size={16} />
                                                    </button>
                                                    
                                                    {/* Dropdown menu */}
                                                    {projectMenuOpen === project.id && (
                                                        <div className="absolute right-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10">
                                                            <div 
                                                                className="px-4 py-2 text-sm hover:bg-gray-800 cursor-pointer flex items-center"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setProjectMenuOpen(null);
                                                                    handleEditProject(project);
                                                                }}
                                                            >
                                                                <FiEdit2 className="mr-2" size={14} /> Rename
                                                            </div>
                                                            <div 
                                                                className="px-4 py-2 text-sm text-red-400 hover:bg-gray-800 cursor-pointer flex items-center"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setProjectMenuOpen(null);
                                                                    showDeleteConfirmation(project);
                                                                }}
                                                            >
                                                                <FiDelete className="mr-2" size={14} /> Delete Project & Files
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        
                                        {/* Tooltip for collapsed mode */}
                                        {!isSidebarExpanded && (
                                            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {project.name}
                                                {project._count && (
                                                    <span className="ml-1 text-gray-400">({project._count.files})</span>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Main Content Area */}
                <div className='flex-1 p-6 overflow-y-auto'>
                    {selectedProject ? (
                        <>
                            {/* Selected Project Header */}
                            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 mb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-start gap-2">
                                        <div>
                                            <h2 className="text-xl font-semibold text-white">
                                                {selectedProject.name}
                                            </h2>
                                            {selectedProject.description && (
                                                <p className="text-sm font-normal text-gray-400 mt-1">
                                                    {selectedProject.description}
                                                </p>
                                            )}
                                            {!selectedProject.description && (
                                                <p className="text-sm font-normal text-gray-500 italic mt-1">
                                                    No description
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleEditProject(selectedProject)}
                                            className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-black/30"
                                            title="Edit project details"
                                        >
                                            <FiEdit2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={openReconnectFilesModal}
                                            className="flex items-center gap-2 px-3 py-1 text-sm rounded bg-purple-600 hover:bg-purple-700"
                                        >
                                            <FiPlus /> Add Files to Project
                                        </button>
                                        <button
                                            onClick={viewAllProjectFiles}
                                            className="flex items-center gap-2 px-3 py-1 text-sm rounded bg-green-600 hover:bg-green-700"
                                        >
                                            <FiColumns />
                                            {projectSelectedFiles.length > 0 
                                                ? `View Selected (${projectSelectedFiles.length})` 
                                                : "View All Files"}
                                        </button>
                                        <button
                                            onClick={handleRefreshClick}
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
                            </div>
                            
                            {/* Selected Files Within Project Actions */}
                            {projectSelectedFiles.length > 0 && (
                                <div className="bg-black/70 border border-green-500 rounded-lg p-4 mb-4 flex justify-between items-center">
                                    <div className="text-green-400">
                                        <span className="mr-2">{projectSelectedFiles.length} files selected</span>
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
                                                initiateDeleteFiles();
                                            }}
                                            className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-700 flex items-center gap-1"
                                        >
                                            <FiTrash2 /> Delete Files
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {/* Transcription List for Selected Project */}
                            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 mb-8">
                                {transcriptionError && (
                                    <div className="mb-4 bg-red-900/30 border border-red-600 text-red-400 px-4 py-3 rounded">
                                        {transcriptionError}
                                    </div>
                                )}
                                
                                {/* REST OF THE EXISTING TRANSCRIPTION LIST CODE */}
                                
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
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                                                <div className="flex items-center justify-end gap-4">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            viewTranscription(file.downloadUrl, file);
                                                                        }}
                                                                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-800 rounded-full group relative"
                                                                        title="View"
                                                                    >
                                                                        <FiFileText className="text-lg" />
                                                                        <span className="absolute hidden group-hover:block bg-gray-900 text-xs px-2 py-1 rounded shadow-lg -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                                                            View
                                                                        </span>
                                                                    </button>
                                                                    <a 
                                                                        href={file.downloadUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-800 rounded-full group relative"
                                                                        title="Download"
                                                                    >
                                                                        <FiDownload className="text-lg" />
                                                                        <span className="absolute hidden group-hover:block bg-gray-900 text-xs px-2 py-1 rounded shadow-lg -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                                                            Download
                                                                        </span>
                                                                    </a>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            initiateDeleteFile(file.key, file.filename);
                                                                        }}
                                                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-full group relative"
                                                                        title="Delete"
                                                                    >
                                                                        <FiTrash2 className="text-lg" />
                                                                        <span className="absolute hidden group-hover:block bg-gray-900 text-xs px-2 py-1 rounded shadow-lg -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                                                            Delete
                                                                        </span>
                                                                    </button>
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
                                            "No files found in this project. Add files to get started."
                                        )}
                                    </div>
                                )}
                            </div>
                            
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
                                                            setSelectedModel("o1");
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
                                        <IdentifySpeakersAgent
                                            selectedFiles={
                                                // Case 1: We have a directly selected transcription
                                                selectedTranscription ? [selectedTranscription] :
                                                // Case 2: Use project-specific selections
                                                projectSelectedFiles.map((fileKey) => {
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
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // No project selected - guide
                        <div className="text-center py-16">
                            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-8 max-w-lg mx-auto">
                                <FiFolder className="w-16 h-16 mx-auto mb-6 text-blue-500" />
                                <h2 className="text-2xl font-semibold mb-4">Select a Project</h2>
                                <p className="text-gray-400 mb-6">
                                    Please select a project from the sidebar to view its files. 
                                    If you don't have a project yet, create one using the + button.
                                </p>
                                <button
                                    onClick={() => setShowNewProjectModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 mx-auto"
                                >
                                    <FiFolderPlus /> Create a Project
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            
            {/* New Project Modal (Keep as is) */}
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
                            <label className="block text-sm font-medium mb-1">Project Name <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                                placeholder="Enter project name"
                            />
                        </div>
                        
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium">Project Description</label>
                                <span className="text-xs text-gray-400">Optional</span>
                            </div>
                            <textarea
                                value={newProjectDescription}
                                onChange={(e) => setNewProjectDescription(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                                placeholder="Add details about this project, such as client name, topic, or purpose"
                                rows={4}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                A good description helps you identify and organize your projects
                            </p>
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
            
            {/* Edit Project Modal (Keep as is) */}
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
                            <label className="block text-sm font-medium mb-1">Project Name <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                                placeholder="Enter project name"
                            />
                        </div>
                        
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium">Project Description</label>
                                <span className="text-xs text-gray-400">Optional</span>
                            </div>
                            <textarea
                                value={newProjectDescription}
                                onChange={(e) => setNewProjectDescription(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                                placeholder="Add details about this project, such as client name, topic, or purpose"
                                rows={4}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                A good description helps you identify and organize your projects
                            </p>
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
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Delete Project Confirmation Modal (New) */}
            {showDeleteProjectModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg w-full max-w-md p-6">
                        <h3 className="text-xl font-semibold mb-4 text-red-400">Delete Project</h3>
                        
                        {projectError && (
                            <div className="mb-4 bg-red-900/30 border border-red-600 text-red-400 px-4 py-2 rounded text-sm">
                                {projectError}
                            </div>
                        )}
                        
                        <p className="mb-6 text-gray-300">
                            Are you sure you want to delete the project "<span className="font-semibold">{projectToDelete?.name}</span>"?
                            <span className="text-red-400 font-medium block mt-2">
                                Warning: This will permanently delete all files associated with this project.
                            </span>
                        </p>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-1">
                                Type <span className="font-mono text-red-400">permanently delete</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                                placeholder="permanently delete"
                            />
                        </div>
                        
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteProjectModal(false);
                                    setProjectToDelete(null);
                                    setDeleteConfirmText("");
                                }}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteProject}
                                disabled={deleteConfirmText.toLowerCase() !== "permanently delete"}
                                className={`px-4 py-2 rounded ${
                                    deleteConfirmText.toLowerCase() === "permanently delete"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-red-900/50 cursor-not-allowed"
                                }`}
                            >
                                Delete Project & Files
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Delete Files Confirmation Modal */}
            {showDeleteFileModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg w-full max-w-md p-6">
                        <h3 className="text-xl font-semibold mb-4 text-red-400">Delete File{filesToDelete.length > 1 ? 's' : ''}</h3>
                        
                        <p className="mb-6 text-gray-300">
                            {filesToDelete.length === 1 && fileDeleteName ? (
                                <>Are you sure you want to delete the file "<span className="font-semibold">{fileDeleteName}</span>"?</>
                            ) : (
                                <>Are you sure you want to delete {filesToDelete.length} selected files?</>
                            )}
                            <br />
                            <span className="text-red-400 mt-2 block text-sm">This action cannot be undone.</span>
                        </p>
                        
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteFileModal(false);
                                    setFilesToDelete([]);
                                    setFileDeleteName("");
                                }}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteFile()}
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Replace Reconnect Session Modal with new Reconnect Files Modal */}
            {showReconnectFilesModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg w-full max-w-4xl p-6">
                        <h3 className="text-xl font-semibold mb-4">Add Files to Project: {selectedProject?.name}</h3>
                        
                        {reconnectMessage && (
                            <div className={`mb-4 p-3 rounded text-sm ${
                                reconnectStatus === 'loading' ? 'bg-blue-900/30 border-l-4 border-blue-500 text-blue-400' :
                                reconnectStatus === 'success' ? 'bg-green-900/30 border-l-4 border-green-500 text-green-400' :
                                reconnectStatus === 'error' ? 'bg-red-900/30 border-l-4 border-red-500 text-red-400' :
                                'bg-gray-800 text-gray-300'
                            }`}>
                                {reconnectStatus === 'loading' && (
                                    <div className="flex items-center">
                                        <div className="mr-2 w-4 h-4 border-2 border-blue-500 border-r-transparent rounded-full animate-spin"></div>
                                        {reconnectMessage}
                                    </div>
                                )}
                                {reconnectStatus !== 'loading' && reconnectMessage}
                            </div>
                        )}
                        
                        {/* Search and file controls */}
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={fileSearchTerm}
                                        onChange={(e) => {
                                            setFileSearchTerm(e.target.value);
                                            setFileListPage(1); // Reset to page 1 when searching
                                        }}
                                        placeholder="Search by filename..."
                                        className="px-3 py-2 pl-9 bg-gray-800 border border-gray-700 rounded text-white w-64"
                                        disabled={isLoadingAvailableFiles}
                                    />
                                    <div className="absolute left-3 top-2.5 text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleSelectAllFiles(true)}
                                    disabled={isLoadingAvailableFiles || getFilteredFiles().length === 0}
                                    className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => handleSelectAllFiles(false)}
                                    disabled={isLoadingAvailableFiles || selectedFilesToAdd.length === 0}
                                    className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500"
                                >
                                    Clear Selection
                                </button>
                                <button
                                    onClick={loadAllAvailableFiles}
                                    disabled={isLoadingAvailableFiles}
                                    className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 flex items-center gap-1 disabled:bg-gray-800 disabled:text-gray-500"
                                >
                                    <FiRefreshCw className={isLoadingAvailableFiles ? "animate-spin" : ""} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                        
                        {/* File list table */}
                        <div className="bg-black/30 rounded-lg overflow-hidden mb-4 max-h-[400px] overflow-y-auto">
                            {isLoadingAvailableFiles ? (
                                <div className="flex justify-center items-center h-40">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                </div>
                            ) : availableFiles.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    No files available to add to this project.
                                </div>
                            ) : getFilteredFiles().length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    No files match your search.
                                </div>
                            ) : (
                                <table className="min-w-full">
                                    <thead className="bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-10">
                                                <div className="flex items-center justify-center">
                                                    <span className="sr-only">Select</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">File Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Current Project</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {getCurrentPageFiles().map((file, index) => (
                                            <tr key={index} 
                                                className={`hover:bg-gray-800/50 cursor-pointer ${
                                                    selectedFilesToAdd.includes(file.key) ? 'bg-blue-900/30' : ''
                                                }`}
                                                onClick={() => toggleFileSelection(file.key)}
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFilesToAdd.includes(file.key)}
                                                            onChange={() => toggleFileSelection(file.key)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{file.filename}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                                                    {new Date(file.lastModified).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                                                    {formatFileSize(file.size)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    {file.projectName ? (
                                                        <span className="text-blue-400">{file.projectName}</span>
                                                    ) : (
                                                        <span className="text-gray-500 italic">None</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        
                        {/* Pagination */}
                        {getFilteredFiles().length > filesPerPage && (
                            <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                                <button
                                    onClick={() => setFileListPage(prev => Math.max(prev - 1, 1))}
                                    disabled={fileListPage === 1}
                                    className={`flex items-center gap-1 ${fileListPage === 1 ? 'text-gray-600 cursor-not-allowed' : 'text-blue-400 hover:text-blue-300'}`}
                                >
                                    <FiChevronLeft /> Previous
                                </button>
                                <span>
                                    Page {fileListPage} of {Math.ceil(getFilteredFiles().length / filesPerPage)}
                                </span>
                                <button
                                    onClick={() => setFileListPage(prev => Math.min(prev + 1, Math.ceil(getFilteredFiles().length / filesPerPage)))}
                                    disabled={fileListPage >= Math.ceil(getFilteredFiles().length / filesPerPage)}
                                    className={`flex items-center gap-1 ${fileListPage >= Math.ceil(getFilteredFiles().length / filesPerPage) ? 'text-gray-600 cursor-not-allowed' : 'text-blue-400 hover:text-blue-300'}`}
                                >
                                    Next <FiChevronRight />
                                </button>
                            </div>
                        )}
                        
                        {/* Action buttons */}
                        <div className="flex justify-end gap-3 mt-6">
                            <div className="flex-1">
                                {selectedFilesToAdd.length > 0 && (
                                    <span className="text-sm text-green-400">
                                        {selectedFilesToAdd.length} file{selectedFilesToAdd.length !== 1 ? 's' : ''} selected
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setShowReconnectFilesModal(false);
                                    setSelectedFilesToAdd([]);
                                    setFileSearchTerm("");
                                    setFileListPage(1);
                                    setReconnectStatus('idle');
                                    setReconnectMessage("");
                                }}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddFilesToCurrentProject}
                                disabled={selectedFilesToAdd.length === 0 || reconnectStatus === 'loading'}
                                className={`px-4 py-2 rounded flex items-center gap-2 ${
                                    selectedFilesToAdd.length === 0 || reconnectStatus === 'loading'
                                    ? "bg-purple-700 cursor-not-allowed"
                                    : "bg-purple-600 hover:bg-purple-700"
                                }`}
                            >
                                {reconnectStatus === 'loading' && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                )}
                                Add {selectedFilesToAdd.length} File{selectedFilesToAdd.length !== 1 ? 's' : ''} to Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </BackgroundWrapper>
    );
}