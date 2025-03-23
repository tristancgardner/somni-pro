"use client"

import { useState } from "react"
import { Loader2, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

interface FileUploadProps {
  projectId: string
}

export function FileUpload({ projectId }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // This is a placeholder for the actual upload logic
  // We'll integrate with your backend API in a future step
  const handleUpload = async () => {
    if (files.length === 0) return
    
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      // Simulate upload progress
      const totalFiles = files.length
      for (let i = 0; i < totalFiles; i++) {
        // Simulate network request
        await new Promise(resolve => setTimeout(resolve, 1000))
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100))
      }
      
      // Reset after "upload"
      setFiles([])
      
      // This is where we would make actual API calls to your backend
      console.log(`Uploaded ${files.length} files to project ${projectId}`)
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center">
        <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
        <div className="text-center mb-4">
          <h3 className="font-medium mb-1">Drag and drop files</h3>
          <p className="text-sm text-muted-foreground">or click to browse</p>
        </div>
        
        <Label htmlFor="file-upload" className="w-full">
          <Input
            id="file-upload"
            type="file"
            multiple
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                setFiles(Array.from(e.target.files))
              }
            }}
          />
          <Button variant="outline" className="w-full">Select Files</Button>
        </Label>
        
        <p className="text-xs text-muted-foreground mt-2">
          Supports MP3, WAV, M4A, FLAC files up to 500MB
        </p>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{files.length} file(s) selected</p>
          <ul className="space-y-1">
            {files.map((file, index) => (
              <li key={index} className="text-sm truncate">
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </li>
            ))}
          </ul>
          
          {isUploading ? (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-xs text-muted-foreground text-center">
                Uploading {uploadProgress}%
              </p>
            </div>
          ) : (
            <Button
              onClick={handleUpload}
              className="w-full"
              disabled={files.length === 0}
            >
              Upload {files.length} file(s)
            </Button>
          )}
        </div>
      )}
      
      {isUploading && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => {
            setIsUploading(false)
            setUploadProgress(0)
          }}>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
} 