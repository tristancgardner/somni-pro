import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import AWS from 'aws-sdk';

// Initialize AWS Batch client
const batch = new AWS.Batch({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Get the user session for authentication
    const session = await getServerSession();
    if (!session) {
      console.error('No valid session found');
      return NextResponse.json(
        { message: 'Unauthorized - no valid session' },
        { status: 401 }
      );
    }

    // 2. Parse the request body to get job IDs
    const requestData = await request.json();
    const { jobIds } = requestData;

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { message: 'No job IDs provided' },
        { status: 400 }
      );
    }

    // 3. Check status for each job ID (in batches of 100 max as per AWS limits)
    const jobStatusRequests = [];
    for (let i = 0; i < jobIds.length; i += 100) {
      const batch100 = jobIds.slice(i, i + 100);
      jobStatusRequests.push(
        batch.describeJobs({ jobs: batch100 }).promise()
      );
    }

    const jobStatusResults = await Promise.all(jobStatusRequests);
    
    // 4. Combine all results
    const allJobs = jobStatusResults.flatMap(result => result.jobs || []);
    
    // 5. Format the results for the client
    const formattedJobs = allJobs.map(job => ({
      jobId: job.jobId,
      jobName: job.jobName,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      stoppedAt: job.stoppedAt,
      exitCode: job.container?.exitCode,
      reason: job.container?.reason || job.statusReason
    }));

    return NextResponse.json({
      jobs: formattedJobs
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Job status check error:', error);
    return NextResponse.json({ 
      message: 'Failed to check job status', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
} 