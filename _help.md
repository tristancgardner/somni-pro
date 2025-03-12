`<think>`You're asking me to create a prompt with instructions that you can give to a new chat. Based on our conversation, I understand you want to summarize the issue and solution regarding the empty WAV files being saved to the database from your upload-audio process.

I'll create a clear, comprehensive prompt that explains:

1. The problem that was identified (empty WAV files getting saved to the database)
2. The solution implemented (filtering out all WAV files in the handleSaveProjectInfo function)
3. Any context needed to understand the issue

This will allow you to quickly brief another assistant or developer on what was done.`</think>`# Prompt: Fixing WAV Files Being Saved to Database

I have an issue in my upload-audio application where empty WAV files (0B) are being unnecessarily saved to my database during file processing.

The issue is in the `handleSaveProjectInfo` function in `app/upload-audio/page.tsx`. Currently, when files are uploaded and associated with a project, the code is including all successfully uploaded files, including WAV files. However, WAV files should never be saved to the database - only their processed JSON transcription results should be stored.

Please:

1. Examine the `handleSaveProjectInfo` function that handles file associations
2. Modify the function to filter out ALL WAV files (based on filename ending with '.wav')
3. Only allow non-WAV files (like JSON files) to be included in the `successfulUploads` array
4. Be careful not to change any other functionality - everything else should work exactly the same

The core issue is in the filtering of `uploadStatuses` where we should exclude all WAV files, regardless of their size.

Here's the relevant part of my code to fix:

```typescript
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
  
    // ... rest of function ...
```
