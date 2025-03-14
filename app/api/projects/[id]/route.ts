import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Schema for project update
const projectUpdateSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required' }).optional(),
  description: z.string().optional(),
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

// GET - Get a specific project and its files
export async function GET(
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

    // Get project with files
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        files: {
          orderBy: { lastModified: 'desc' },
        },
      },
    });

    return NextResponse.json({ project }, { status: 200 });
  } catch (error: any) {
    console.error('Error getting project:', error);
    return NextResponse.json({ 
      message: 'Failed to get project', 
      error: error.message 
    }, { status: 500 });
  }
}

// PATCH - Update a project
export async function PATCH(
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
    const validation = projectUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid project data', errors: validation.error.format() },
        { status: 400 }
      );
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(validation.data.name && { name: validation.data.name }),
        ...(validation.data.description !== undefined && { description: validation.data.description }),
      },
    });

    return NextResponse.json({ project: updatedProject }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ 
      message: 'Failed to update project', 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // The params are already available and don't need to be awaited
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

    // Get all files associated with this project using the correct model
    // ProjectFile is not the correct model name - let's use the correct relation
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        files: true // Include the related files
      }
    });

    if (!project || !project.files) {
      return NextResponse.json(
        { message: 'Project not found or has no files' },
        { status: 404 }
      );
    }

    // Initialize S3 client for file deletion
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    // Delete all files from S3 that are associated with this project
    const bucket = process.env.S3_TRANSCRIBE_BUCKET || process.env.AWS_BUCKET_NAME;
    if (!bucket) {
      return NextResponse.json(
        { message: 'S3 bucket configuration error' },
        { status: 500 }
      );
    }

    // Delete files from S3
    for (const file of project.files) {
      try {
        console.log(`Deleting file with key: ${file.s3Key}`);
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: file.s3Key,
          })
        );
      } catch (fileError) {
        console.error(`Error deleting file ${file.s3Key} from S3:`, fileError);
        // Continue with deletion even if one file fails
      }
    }

    // Delete the project (which will cascade delete all file associations)
    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json(
      { message: `Project and ${project.files.length} files deleted successfully` },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ 
      message: 'Failed to delete project', 
      error: error.message 
    }, { status: 500 });
  }
} 