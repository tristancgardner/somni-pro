import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for file removal by key
const removeFileByKeySchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
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

// POST - Remove a file from a project using its S3 key
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
    const validation = removeFileByKeySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid file data', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { fileKey } = validation.data;

    // Find the transcription file using the key
    const file = await prisma.transcriptionFile.findFirst({
      where: {
        s3Key: fileKey,
        projectId: projectId,
      },
    });

    if (!file) {
      // Try to find by key field if not found by s3Key
      const fileByKey = await prisma.transcriptionFile.findFirst({
        where: {
          key: fileKey, 
          projectId: projectId,
        },
      });

      if (!fileByKey) {
        return NextResponse.json(
          { message: 'File not found in this project' },
          { status: 404 }
        );
      }

      // Remove file from project (set projectId to null)
      await prisma.transcriptionFile.update({
        where: { id: fileByKey.id },
        data: { projectId: null },
      });
    } else {
      // Remove file from project (set projectId to null)
      await prisma.transcriptionFile.update({
        where: { id: file.id },
        data: { projectId: null },
      });
    }

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