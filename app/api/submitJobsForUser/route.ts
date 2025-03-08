import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import AWS from 'aws-sdk';

// Initialize AWS SDK clients
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const batch = new AWS.Batch({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Function to sanitize job name - AWS Batch job names must contain only alphanumeric characters, hyphens, and underscores
function sanitizeJobName(name: string): string {
  // Replace @ and other special characters with hyphens
  return name.replace(/[^a-zA-Z0-9-_]/g, '-');
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting batch job submission process...');
    
    // Get data from request body
    const requestData = await request.json();
    const { userEmail, sessionId } = requestData;
    
    // Validate required parameters
    if (!userEmail || !sessionId) {
      // Fallback to session if not provided in request body
      const session = await getServerSession();
      if (!session || !session.user?.email) {
        console.error('No valid session found and no userEmail/sessionId provided');
        return NextResponse.json(
          { message: 'Unauthorized - missing user email or session ID' },
          { status: 400 }
        );
      }
    }
    
    // Use provided values or fallbacks
    const userEmailToUse = userEmail || (await getServerSession())?.user?.email || 'unknown-user';
    const sessionIdToUse = sessionId || `fallback-${Date.now()}`;
    
    console.log('User email for batch job:', userEmailToUse);
    console.log('Session ID for batch job:', sessionIdToUse);
    
    // Construct the S3 input prefix for this user and session
    const s3InputPrefix = `input/${userEmailToUse}/${sessionIdToUse}/`;
    const s3OutputPrefix = `output/${userEmailToUse}/${sessionIdToUse}/`;
    const s3Bucket = process.env.S3_TRANSCRIBE_BUCKET!;
    
    // List all objects under that prefix
    const listParams = {
      Bucket: s3Bucket,
      Prefix: s3InputPrefix
    };

    console.log(`Listing objects in s3://${s3Bucket}/${s3InputPrefix}`);
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    
    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return NextResponse.json({ 
        message: `No files found in s3://${s3Bucket}/${s3InputPrefix}`, 
        jobIds: [] 
      }, { status: 200 });
    }

    console.log(`Found ${listedObjects.Contents.length} files`);
    
    // Filter for audio files (assuming .wav, .mp3, .m4a extensions)
    const audioFiles = listedObjects.Contents.filter(obj => {
      const key = obj.Key || '';
      return key.endsWith('.wav') || key.endsWith('.mp3') || key.endsWith('.m4a');
    });
    
    if (audioFiles.length === 0) {
      return NextResponse.json({ 
        message: 'No audio files found in your input directory', 
        jobIds: [] 
      }, { status: 200 });
    }

    console.log(`Found ${audioFiles.length} audio files`);
    
    // Submit a single batch job for all files in this session
    // Create a sanitized job name that complies with AWS Batch requirements
    const sanitizedUserEmail = sanitizeJobName(userEmailToUse);
    const jobName = `transcribe-${sanitizedUserEmail}-${sessionIdToUse}`;
    
    const jobParams = {
      jobName,
      jobQueue: process.env.AWS_BATCH_JOB_QUEUE!,
      jobDefinition: process.env.AWS_BATCH_JOB_DEFINITION!,
      containerOverrides: {
        environment: [
          { name: 'S3_BUCKET', value: s3Bucket },
          { name: 'INPUT_PREFIX', value: s3InputPrefix },
          { name: 'OUTPUT_PREFIX', value: s3OutputPrefix },
          { name: 'USER_EMAIL', value: userEmailToUse }
        ]
      }
    };
    
    console.log(`Submitting batch job with parameters:`, {
      jobName,
      inputPrefix: s3InputPrefix,
      outputPrefix: s3OutputPrefix
    });
    
    const jobResponse = await batch.submitJob(jobParams).promise();
    console.log(`Job submitted: ${jobResponse.jobId} for ${s3InputPrefix}`);
    
    // Return job info
    return NextResponse.json({
      message: `Successfully submitted transcription job for ${audioFiles.length} audio files`,
      jobIds: [{
        jobId: jobResponse.jobId,
        jobName: jobResponse.jobName,
        fileName: `${audioFiles.length} files in ${s3InputPrefix}`
      }]
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Batch job submission error:', error);
    return NextResponse.json({ 
      message: 'Failed to submit transcription jobs', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
} 