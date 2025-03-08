# Session-Based Transcription System

This document describes the session-based audio transcription system for SomniPro. The system allows users to upload audio files to session-specific S3 directories and submit AWS Batch jobs to transcribe all files in a session.

## Key Features

1. **Session-Based Organization**: Each batch of uploads gets a unique session ID
2. **User-Specific Folders**: Files are stored in user-specific folders based on email
3. **Batch Processing**: Single AWS Batch job processes all files in a session
4. **Status Monitoring**: Real-time tracking of batch job progress
5. **Results Viewing**: Browse and download completed transcriptions by session

## Directory Structure

Files are organized in S3 using the following structure:

```
s3://{S3_TRANSCRIBE_BUCKET}/
  ├── input/
  │   └── {userEmail}/
  │       └── {sessionId}/
  │           ├── file1.wav
  │           ├── file2.wav
  │           └── ...
  └── output/
      └── {userEmail}/
          └── {sessionId}/
              ├── file1.json
              ├── file2.json
              └── ...
```

## API Endpoints

### 1. `/api/uploadTest` (POST)

Uploads a single file to the user's session-specific input directory.

**Request:**
- `FormData` with:
  - `testFile`: The file to upload
  - `userEmail`: User's email address
  - `sessionId`: Unique session identifier

**Response:**
```json
{
  "message": "File uploaded successfully!",
  "location": "https://s3.amazonaws.com/bucket-name/input/user@example.com/session-id/filename.wav",
  "s3Path": "s3://bucket-name/input/user@example.com/session-id/filename.wav"
}
```

### 2. `/api/submitJobsForUser` (POST)

Submits a batch job to process all files in a specific session.

**Request:**
```json
{
  "userEmail": "user@example.com",
  "sessionId": "unique-session-id"
}
```

**Response:**
```json
{
  "message": "Successfully submitted transcription job for 5 audio files",
  "jobIds": [
    {
      "jobId": "aws-batch-job-id",
      "jobName": "transcribe-user@example.com-session-id",
      "fileName": "5 files in input/user@example.com/session-id/"
    }
  ]
}
```

### 3. `/api/checkJobStatus` (POST)

Checks the status of submitted batch jobs.

**Request:**
```json
{
  "jobIds": ["job-id-1", "job-id-2"]
}
```

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "job-id-1",
      "jobName": "transcribe-user@example.com-session-id",
      "status": "SUCCEEDED",
      "createdAt": "2023-07-12T18:30:15.000Z",
      "startedAt": "2023-07-12T18:30:45.000Z",
      "stoppedAt": "2023-07-12T18:35:22.000Z",
      "exitCode": 0
    }
  ]
}
```

### 4. `/api/list-transcriptions` (GET)

Lists completed transcription files from a session.

**Query Parameters:**
- `sessionId`: The session ID to list files from
- `prefix` (optional): Override the default output prefix
- `continuationToken` (optional): For pagination
- `maxResults` (optional): Maximum number of results to return

**Response:**
```json
{
  "prefix": "output/user@example.com/session-id/",
  "files": [
    {
      "key": "output/user@example.com/session-id/file1.json",
      "filename": "file1.json",
      "size": 12345,
      "lastModified": "2023-07-12T18:40:15.000Z",
      "downloadUrl": "https://presigned-url-for-download"
    }
  ],
  "nextContinuationToken": "token-for-next-page",
  "isTruncated": true
}
```

## Environment Variables

Required environment variables:

```
# AWS Configuration
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_TRANSCRIBE_BUCKET=your-bucket-name

# AWS Batch Configuration
AWS_BATCH_JOB_QUEUE=your-job-queue-name
AWS_BATCH_JOB_DEFINITION=your-job-definition-name
```

## Batch Processing Container Configuration

The AWS Batch job expects the following environment variables:

- `S3_BUCKET`: The S3 bucket name
- `INPUT_PREFIX`: The input directory prefix (e.g., `input/user@example.com/session-id/`)
- `OUTPUT_PREFIX`: The output directory prefix (e.g., `output/user@example.com/session-id/`)
- `USER_EMAIL`: The user's email address (for logging/tracking)

## Testing Workflow

1. **Log into the application** to establish your user session
2. **Visit `/upload-test`** to access the testing interface
3. **Upload files** using the file upload form
4. **Submit the batch job** using the "Submit Transcription Jobs" button
5. **Monitor job status** in the Jobs Status table
6. **View and download results** when the job completes 