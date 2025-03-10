import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import AWS from 'aws-sdk';

// Initialize AWS S3 client
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Schemas for file operations
const addFilesSchema = z.object({
  fileKeys: z.array(z.string()).min(1, { message: 'At least one file key is required' }),
});

const removeFileSchema = z.object({
  fileId: z.string().uuid({ message: 'Valid file ID is required' }),
});

// Helper to check if the user owns the project
async function verifyProjectAccess(projectId: string, userEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    return { error: 'User not found', statusCode: 404 };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return { error: 'Project not found', statusCode: 404 };
  }

  if (project.userId !== user.id) {
    return { error: 'You do not have permission to access this project', statusCode: 403 };
  }

  return { user, project };
}

// POST - Add files to a project
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    // Authenticate the user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized - no valid session' },
        { status: 401 }
      );
    }

    // Verify access to the project
    const access = await verifyProjectAccess(projectId, session.user.email);
    if ('error' in access) {
      return NextResponse.json(
        { message: access.error },
        { status: access.statusCode }
      );
    }

    // Get and validate request body
    const body = await request.json();
    const validation = addFilesSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid file data', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { fileKeys } = validation.data;
    const addedFiles = [];
    const errorFiles = [];

    // Get file details from S3
    for (const key of fileKeys) {
      try {
        // Get file metadata from S3
        const headParams = {
          Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
          Key: key,
        };
        
        const fileMetadata = await s3.headObject(headParams).promise();
        
        // Check if file already exists in database
        let file = await prisma.transcriptionFile.findUnique({
          where: { s3Key: key },
        });
        
        if (file) {
          // Update existing file with new project
          file = await prisma.transcriptionFile.update({
            where: { id: file.id },
            data: { projectId },
          });
        } else {
          // Extract filename from the full path
          const filename = key.split('/').pop() || key;
          
          // Create new file entry
          file = await prisma.transcriptionFile.create({
            data: {
              s3Key: key,
              filename,
              size: fileMetadata.ContentLength || 0,
              lastModified: fileMetadata.LastModified || new Date(),
              projectId,
            },
          });
        }
        
        addedFiles.push(file);
      } catch (err) {
        console.error(`Error adding file ${key}:`, err);
        errorFiles.push({ key, error: (err as Error).message });
      }
    }

    return NextResponse.json({ 
      addedFiles,
      errorFiles,
      message: `Added ${addedFiles.length} files to project ${errorFiles.length > 0 ? `(${errorFiles.length} errors)` : ''}`,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error adding files to project:', error);
    return NextResponse.json({ 
      message: 'Failed to add files to project', 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE - Remove a file from a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    // Authenticate the user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized - no valid session' },
        { status: 401 }
      );
    }

    // Verify access to the project
    const access = await verifyProjectAccess(projectId, session.user.email);
    if ('error' in access) {
      return NextResponse.json(
        { message: access.error },
        { status: access.statusCode }
      );
    }

    // Get and validate request body
    const body = await request.json();
    const validation = removeFileSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid file data', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { fileId } = validation.data;

    // Verify file exists and belongs to this project
    const file = await prisma.transcriptionFile.findFirst({
      where: {
        id: fileId,
        projectId,
      },
    });

    if (!file) {
      return NextResponse.json(
        { message: 'File not found in this project' },
        { status: 404 }
      );
    }

    // Remove file from project (set projectId to null)
    await prisma.transcriptionFile.update({
      where: { id: fileId },
      data: { projectId: null },
    });

    return NextResponse.json({ 
      message: 'File removed from project successfully',
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error removing file from project:', error);
    return NextResponse.json({ 
      message: 'Failed to remove file from project', 
      error: error.message 
    }, { status: 500 });
  }
} 