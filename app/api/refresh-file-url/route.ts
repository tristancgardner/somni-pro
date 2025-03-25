import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  try {
    // 1. Get URL parameters
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('key');
    
    if (!fileKey) {
      return NextResponse.json(
        { error: 'Missing file key parameter' },
        { status: 400 }
      );
    }
    
    // 2. Authenticate user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - no valid session' },
        { status: 401 }
      );
    }
    
    // 3. Generate a fresh presigned URL
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
      Key: fileKey,
    });
    
    // Create a presigned URL that's valid for 1 hour
    const downloadUrl = await getSignedUrl(s3Client, getObjectCommand, { 
      expiresIn: 3600 
    });
    
    return NextResponse.json({
      downloadUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error refreshing file URL:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh file URL', 
      details: error.message
    }, { status: 500 });
  }
} 