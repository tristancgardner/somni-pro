import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import AWS from 'aws-sdk';
import { parse } from 'url';
import path from 'path';

// Initialize AWS S3 client
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Get the user session for authentication
    const session = await getServerSession();
    if (!session) {
      console.error('No valid session found');
      return NextResponse.json(
        { message: 'Unauthorized - no valid session' },
        { status: 401 }
      );
    }

    // Get the transcription data and the URL from the request body
    const { transcriptionData, jsonUrl } = await request.json();
    
    if (!transcriptionData || !jsonUrl) {
      return NextResponse.json({ message: 'Missing required data' }, { status: 400 });
    }
    
    // Extract the S3 key from the URL
    // The URL might be something like:
    // https://bucket-name.s3.region.amazonaws.com/path/to/file.json?signed-params
    // Or it could be a pre-signed URL with query parameters
    const parsedUrl = parse(jsonUrl);
    
    // Extract the path from the URL (remove any query parameters)
    let s3Path = parsedUrl.pathname || '';
    if (s3Path.startsWith('/')) s3Path = s3Path.substring(1);
    
    // Decode URL-encoded characters (e.g., %40 → @)
    s3Path = decodeURIComponent(s3Path);
    
    // Get the bucket name from env (don't try to parse it from the URL as it might be complex)
    const bucketName = process.env.S3_TRANSCRIBE_BUCKET!;
    
    console.log(`Saving updated transcription to s3://${bucketName}/${s3Path}`);
    
    // Upload the updated transcription data to S3
    const uploadResult = await s3
      .putObject({
        Bucket: bucketName,
        Key: s3Path,
        Body: JSON.stringify(transcriptionData, null, 2),
        ContentType: 'application/json',
      })
      .promise();
    
    console.log('Transcription update successful');
    
    return NextResponse.json({
      success: true,
      message: 'Transcription updated successfully',
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error saving transcription:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Failed to save transcription', 
      error: error.message 
    }, { status: 500 });
  }
} 