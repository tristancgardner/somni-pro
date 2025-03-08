import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import AWS from 'aws-sdk';

// Initialize AWS S3 client
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function GET(request: NextRequest) {
  try {
    // 1. Get URL parameters
    const { searchParams } = new URL(request.url);
    const continuationToken = searchParams.get('continuationToken') || undefined;
    const maxResults = parseInt(searchParams.get('maxResults') || '50', 10);
    const sessionId = searchParams.get('sessionId');
    
    // Get the prefix from the query params or determine it based on session
    let prefix = searchParams.get('prefix');
    
    if (!prefix) {
      // If no prefix provided, we need user info to construct the prefix
      const session = await getServerSession();
      if (!session) {
        console.error('No valid session found and no prefix provided');
        return NextResponse.json(
          { message: 'Unauthorized - no valid session' },
          { status: 401 }
        );
      }
      
      // Extract user ID or email from session
      const userEmail = session.user?.email || 'unknown-user';
      
      // If sessionId was provided, create a session-specific prefix
      if (sessionId) {
        prefix = `output/${userEmail}/${sessionId}/`;
      } else {
        // Otherwise, list all files in the user's output directory
        prefix = `output/${userEmail}/`;
      }
    }
    
    // 4. List objects in the specified directory
    const listParams = {
      Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
      Prefix: prefix,
      MaxKeys: maxResults,
      ContinuationToken: continuationToken
    };

    console.log(`Listing transcriptions in s3://${listParams.Bucket}/${prefix}`);
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    
    // 5. Format the results
    const transcriptionFiles = (listedObjects.Contents || []).map(obj => {
      // Extract filename from the full path
      const key = obj.Key!;
      const filename = key.split('/').pop() || key;
      
      // Create a pre-signed URL for downloading the file (valid for 1 hour)
      const downloadUrl = s3.getSignedUrl('getObject', {
        Bucket: listParams.Bucket,
        Key: key,
        Expires: 3600 // 1 hour
      });
      
      return {
        key,
        filename,
        size: obj.Size,
        lastModified: obj.LastModified,
        downloadUrl
      };
    });
    
    return NextResponse.json({
      prefix,
      files: transcriptionFiles,
      nextContinuationToken: listedObjects.NextContinuationToken,
      isTruncated: listedObjects.IsTruncated
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error listing transcriptions:', error);
    return NextResponse.json({ 
      message: 'Failed to list transcriptions', 
      error: error.message
    }, { status: 500 });
  }
} 