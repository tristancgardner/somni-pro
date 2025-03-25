import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// POST /api/associate-files - Associate uploaded files with a project
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Parse request body
    const { files, projectId, description, sessionId } = await req.json();
    
    // Validate request - now projectId is the minimum required
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Verify project exists and belongs to the user
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: user.id,
      },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // If description is provided and different from current, update project description
    if (description && description !== project.description) {
      await prisma.project.update({
        where: { id: projectId },
        data: { description },
      });
    }
    
    // We're storing the session-project relationship in the project description for now
    // This is a temporary workaround until we can properly migrate the database
    // But we'll keep it separate from the user's actual description
    if (sessionId) {
      // Store session ID in a separate metadata field or table instead of overwriting description
      await prisma.$executeRaw`
        UPDATE "Project" 
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb), 
          '{sessionId}', 
          to_jsonb(${sessionId})
        ) 
        WHERE id = ${projectId}
      `;
    }
    
    // If files are provided, associate them with the project
    let createdFiles = [];
    if (files && Array.isArray(files) && files.length > 0) {
      const bucket = process.env.S3_TRANSCRIBE_BUCKET || process.env.AWS_BUCKET_NAME;
      if (!bucket) {
        throw new Error('No S3 bucket name found in environment variables');
      }

      createdFiles = await Promise.all(
        files.map(async (file: { s3Key: string; filename: string }) => {
          try {
            // Get file metadata from S3
            const headObjectCommand = new HeadObjectCommand({
              Bucket: bucket,
              Key: file.s3Key,
            });
            
            const s3Object = await s3Client.send(headObjectCommand);
            
            // Check if the file already exists in the database (by s3Key)
            const existingFile = await prisma.transcriptionFile.findUnique({
              where: { s3Key: file.s3Key },
            });
            
            if (existingFile) {
              // Update existing file with project association
              return prisma.transcriptionFile.update({
                where: { id: existingFile.id },
                data: { 
                  projectId: projectId,
                  size: s3Object.ContentLength || 0,
                  lastModified: s3Object.LastModified || new Date(),
                },
              });
            } else {
              // Create new file record
              return prisma.transcriptionFile.create({
                data: {
                  s3Key: file.s3Key,
                  filename: file.filename,
                  size: s3Object.ContentLength || 0,
                  lastModified: s3Object.LastModified || new Date(),
                  projectId: projectId,
                },
              });
            }
          } catch (error) {
            console.error(`Error processing file ${file.s3Key}:`, error);
            // Continue with other files even if one fails
            return null;
          }
        })
      );

      // Filter out any null results from failed file processing
      createdFiles = createdFiles.filter(file => file !== null);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: files?.length > 0 
        ? 'Files associated with project successfully' 
        : 'Project information saved for session',
      files: createdFiles 
    });
  } catch (error) {
    console.error('Error associating files with project:', error);
    return NextResponse.json(
      { error: 'Failed to associate files with project' },
      { status: 500 }
    );
  }
} 