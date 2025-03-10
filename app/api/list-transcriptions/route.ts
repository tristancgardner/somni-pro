import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import AWS from 'aws-sdk';
import { prisma } from '@/lib/prisma';

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
    const projectId = searchParams.get('projectId');
    
    // Get the prefix from the query params or determine it based on session
    let prefix = searchParams.get('prefix');
    
    // 2. Authenticate user
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.error('No valid session found and no prefix provided');
      return NextResponse.json(
        { message: 'Unauthorized - no valid session' },
        { status: 401 }
      );
    }
    
    // Project-based filtering
    if (projectId) {
      // Find the user
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      
      if (!user) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }
      
      // Find the project and ensure it belongs to the user
      const project = await prisma.project.findFirst({
        where: { 
          id: projectId,
          userId: user.id
        },
        include: {
          files: true,
        },
      });
      
      if (!project) {
        return NextResponse.json(
          { message: 'Project not found or access denied' },
          { status: 404 }
        );
      }
      
      // Generate pre-signed URLs for each file
      const transcriptionFiles = await Promise.all(project.files.map(async (file) => {
        const downloadUrl = s3.getSignedUrl('getObject', {
          Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
          Key: file.s3Key,
          Expires: 3600 // 1 hour
        });
        
        return {
          key: file.s3Key,
          filename: file.filename,
          size: file.size,
          lastModified: file.lastModified,
          downloadUrl,
          projectId: project.id,
          projectName: project.name
        };
      }));
      
      return NextResponse.json({
        files: transcriptionFiles,
        projectName: project.name,
        projectId: project.id
      }, { status: 200 });
    } 
    
    // Regular S3 listing (when not filtering by project)
    
    // Extract user ID or email from session
    const userEmail = session.user?.email || 'unknown-user';
    
    // If sessionId was provided, create a session-specific prefix
    if (sessionId) {
      prefix = `output/${userEmail}/${sessionId}/`;
    } else if (!prefix) {
      // Otherwise, list all files in the user's output directory
      prefix = `output/${userEmail}/`;
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
    
    // 5. Format the results and check if they're in projects
    const transcriptionFiles = await Promise.all((listedObjects.Contents || []).map(async (obj) => {
      // Extract filename from the full path
      const key = obj.Key!;
      const filename = key.split('/').pop() || key;
      
      // Create a pre-signed URL for downloading the file (valid for 1 hour)
      const downloadUrl = s3.getSignedUrl('getObject', {
        Bucket: listParams.Bucket,
        Key: key,
        Expires: 3600 // 1 hour
      });
      
      // Check if file is in a project
      let projectId = null;
      let projectName = null;
      
      try {
        if (prisma && prisma.transcriptionFile) {
          const fileRecord = await prisma.transcriptionFile.findUnique({
            where: { s3Key: key },
            include: { project: true }
          });
          
          if (fileRecord && fileRecord.project) {
            projectId = fileRecord.projectId;
            projectName = fileRecord.project.name;
          }
        }
      } catch (err) {
        console.log(`Info: Could not check if file ${key} is in a project:`, err);
        // Continue without project info
      }
      
      return {
        key,
        filename,
        size: obj.Size,
        lastModified: obj.LastModified,
        downloadUrl,
        projectId,
        projectName
      };
    }));
    
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