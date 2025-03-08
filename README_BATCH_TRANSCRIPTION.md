# Batch Transcription System

This document describes how to set up and use the batch transcription system for SomniPro. The system allows users to upload audio files to their own S3 directory and submit AWS Batch jobs to transcribe all files at once.

## Overview

The batch transcription system includes:

1. **Upload Functionality**: Upload audio files to user-specific folders in S3
2. **Batch Processing**: Submit AWS Batch jobs for each audio file in a user's folder
3. **Status Monitoring**: Track the status of all submitted jobs
4. **Results Viewing**: Browse and download completed transcriptions

## Required Environment Variables

Add the following variables to your `.env` file:

```
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_INPUT_BUCKET=your-input-bucket
S3_OUTPUT_BUCKET=your-output-bucket  # Can be the same as input bucket

# AWS Batch Configuration
AWS_BATCH_JOB_QUEUE=your-job-queue-name
AWS_BATCH_JOB_DEFINITION=your-job-definition-name
```

## AWS Batch Configuration

### 1. Create Job Definition

Create an AWS Batch job definition that:
- Uses a container image with your transcription software
- Configures the container to read input files from S3
- Writes transcription results back to S3
- Accepts the following environment variables:
  - `S3_INPUT_BUCKET`
  - `S3_INPUT_KEY`
  - `S3_OUTPUT_BUCKET`
  - `S3_OUTPUT_KEY_PREFIX`
  - `USER_EMAIL`

### 2. Create Compute Environment

Create an AWS Batch compute environment with:
- Appropriate instance types for your workload
- IAM roles with permissions to access S3
- Auto-scaling options based on your needs

### 3. Create Job Queue

Create an AWS Batch job queue and connect it to your compute environment.

## User Flow

1. **Upload Files**:
   - User uploads audio files via the "Batch Upload" page
   - Files are stored in `s3://<your-bucket>/input/<user-id>/`

2. **Submit Jobs**:
   - User navigates to the "Batch Transcribe" page
   - Clicks "Submit Transcription Jobs"
   - System finds all audio files in their input directory
   - System submits one AWS Batch job per file

3. **Monitor Progress**:
   - The jobs table displays the status of each job
   - Status updates automatically every 15 seconds 
   - Users can also manually refresh the status

4. **Access Results**:
   - Completed transcriptions appear in the "Completed Transcriptions" panel
   - Users can download JSON files with transcription results
   - Results are stored in `s3://<your-bucket>/output/<user-id>/`

## API Endpoints

The system includes several API endpoints:

- **POST /api/uploadTest**: Upload a single file to S3
- **POST /api/submitJobsForUser**: Submit batch transcription jobs
- **POST /api/checkJobStatus**: Check status of submitted jobs
- **GET /api/list-transcriptions**: List completed transcription files

## Troubleshooting

### Common Issues

1. **No Files Found**: 
   - Check that files were uploaded to the correct S3 path
   - Verify AWS credentials have proper S3 permissions

2. **Job Submission Fails**:
   - Verify AWS Batch configuration (job queue, job definition)
   - Check AWS credentials have proper Batch permissions

3. **Jobs Stay in RUNNABLE State**:
   - Your compute environment may not have capacity
   - Check AWS Batch compute environment settings

4. **Transcription Results Not Appearing**:
   - Verify the batch job is writing to the correct output path
   - Check permissions on the S3 output bucket

For more help, check AWS CloudWatch logs for your Batch jobs. 