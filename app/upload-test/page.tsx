"use client";

import React, { useState } from 'react';

export default function UploadTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedLocation, setUploadedLocation] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setMessage('');
      setUploadedLocation(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setMessage('Uploading your file to S3...');
    setUploadedLocation(null);
    
    const formData = new FormData();
    formData.append('testFile', selectedFile);

    try {
      const res = await fetch('/api/uploadTest', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Upload failed.');
      }
      
      setMessage(`Upload successful!`);
      setUploadedLocation(data.location);
    } catch (err: any) {
      setMessage(`Upload error: ${err.message}`);
      setUploadedLocation(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main style={{ 
      padding: '2rem', 
      color: '#ffffff', 
      backgroundColor: '#121212', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#ffffff', marginBottom: '2rem' }}>Test S3 Upload (Next.js App Router)</h1>
      
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        padding: '2rem', 
        borderRadius: '8px',
        maxWidth: '600px'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="file-upload" 
            style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold' 
            }}
          >
            Select a .wav file to upload:
          </label>
          <input 
            id="file-upload"
            type="file" 
            accept=".wav" 
            onChange={handleFileChange}
            style={{ 
              color: '#ffffff', 
              background: 'transparent',
              width: '100%',
              padding: '0.5rem 0'
            }}
            disabled={isUploading}
          />
          {selectedFile && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#aaa' }}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>
        
        <button 
          onClick={handleUpload}
          disabled={isUploading || !selectedFile}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: isUploading ? '#6b7280' : '#4f46e5', 
            color: 'white', 
            border: 'none', 
            borderRadius: '0.25rem',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.2s ease',
            width: '100%'
          }}
        >
          {isUploading ? 'Uploading...' : 'Upload to S3'}
        </button>
        
        {message && (
          <div style={{ 
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '0.25rem',
            backgroundColor: message.includes('error') ? 'rgba(220, 38, 38, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            borderLeft: `4px solid ${message.includes('error') ? '#dc2626' : '#10b981'}`,
            color: message.includes('error') ? '#f87171' : '#34d399'
          }}>
            <p style={{ 
              margin: 0,
              fontWeight: 'bold'
            }}>
              {message}
            </p>
            
            {uploadedLocation && (
              <p style={{ 
                margin: '0.5rem 0 0 0',
                wordBreak: 'break-all',
                fontSize: '0.9rem',
                color: '#94a3b8'
              }}>
                File URL: {uploadedLocation}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
} 