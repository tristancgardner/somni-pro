"use client";

import React, { useState, useEffect } from "react";
import MediaBin from "../../components/MediaBin";
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "@/components/BackgroundWrapper";

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
};

export default function MediaBinTestPage() {
  // State for file selection and data
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [transcriptions, setTranscriptions] = useState<TranscriptionFile[]>([]);
  const [isLoadingTranscriptions, setIsLoadingTranscriptions] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [resultsPage, setResultsPage] = useState<number>(1);
  const maxResultsPerPage = 10;
  const [hasMoreTranscriptions, setHasMoreTranscriptions] = useState(false);
  
  // Fetch the C1A project and its files
  useEffect(() => {
    const loadProjectC1A = async () => {
      setIsLoadingProject(true);
      setError(null);
      
      try {
        // First, fetch all projects
        const projectsResponse = await fetch('/api/projects');
        
        if (!projectsResponse.ok) {
          throw new Error('Failed to load projects');
        }
        
        const projectsData = await projectsResponse.json();
        
        // Find the C1A project
        const c1aProject = projectsData.projects.find(
          (p: Project) => p.name.includes('C1A')
        );
        
        if (!c1aProject) {
          throw new Error('Project C1A not found. Please create a project with "C1A" in the name.');
        }
        
        setProject(c1aProject);
        
        // Now fetch files for this project
        await loadProjectFiles(c1aProject.id);
        
      } catch (err: any) {
        console.error('Error loading project:', err);
        setError(err.message || 'Failed to load project');
      } finally {
        setIsLoadingProject(false);
      }
    };
    
    loadProjectC1A();
  }, []);
  
  const loadProjectFiles = async (projectId: string) => {
    setIsLoadingTranscriptions(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('projectId', projectId);
      params.append('maxResults', maxResultsPerPage.toString());
      
      const res = await fetch(`/api/list-transcriptions?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error('Failed to load transcription files');
      }
      
      const data = await res.json();
      
      setTranscriptions(data.files || []);
      setHasMoreTranscriptions(data.isTruncated || false);
      
    } catch (err: any) {
      console.error('Error loading transcription files:', err);
      setError(err.message || 'Failed to load files');
    } finally {
      setIsLoadingTranscriptions(false);
    }
  };
  
  // Handler functions
  const handleSelectFile = (key: string) => {
    if (selectedFiles.includes(key)) {
      setSelectedFiles(prev => prev.filter(k => k !== key));
    } else {
      setSelectedFiles(prev => [...prev, key]);
    }
  };
  
  const handleViewFile = (url: string, file: any) => {
    console.log("View file:", url, file);
    alert(`Viewing file: ${file.filename}`);
  };
  
  const handleDeleteFile = (key: string, filename: string) => {
    console.log("Delete file:", key, filename);
    alert(`Delete file: ${filename}`);
  };
  
  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && resultsPage > 1) {
      setResultsPage(prev => prev - 1);
    } else if (direction === 'next') {
      setResultsPage(prev => prev + 1);
    }
  };
  
  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };
  
  const selectAllFiles = () => {
    setSelectedFiles(transcriptions.map(file => file.key));
  };

  return (
    <BackgroundWrapper>
      <PageHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">MediaBin Component Test</h1>
          <p className="text-gray-400 mt-2">
            This page is testing the MediaBin component with real data from project C1A.
          </p>
        </div>
        
        {/* Status information */}
        <div className="mb-6 bg-black/50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-2">Project Status</h2>
          
          {isLoadingProject ? (
            <div className="flex items-center text-blue-400">
              <div className="mr-2 animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              Loading project...
            </div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : project ? (
            <div className="text-green-400">
              Loaded project: {project.name}
              {project.description && (
                <span className="block text-sm text-gray-400 mt-1">
                  {project.description}
                </span>
              )}
            </div>
          ) : (
            <div className="text-yellow-400">No project loaded</div>
          )}
        </div>
        
        {/* MediaBin Component */}
        {(project && transcriptions.length > 0) || isLoadingTranscriptions ? (
          <MediaBin 
            transcriptions={transcriptions}
            selectedFiles={selectedFiles}
            onSelectFile={handleSelectFile}
            onViewFile={handleViewFile}
            onDeleteFile={handleDeleteFile}
            resultsPage={resultsPage}
            maxResultsPerPage={maxResultsPerPage}
            hasMoreTranscriptions={hasMoreTranscriptions}
            onPageChange={handlePageChange}
            isLoadingTranscriptions={isLoadingTranscriptions}
            clearSelectedFiles={clearSelectedFiles}
            selectAllFiles={selectAllFiles}
            currentProject={true}
          />
        ) : !isLoadingProject && !error ? (
          <div className="bg-black/50 p-6 rounded-lg text-center text-gray-400">
            No files found in project C1A.
          </div>
        ) : null}
      </main>
    </BackgroundWrapper>
  );
} 