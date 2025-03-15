import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
          ${sessionId}::text::jsonb
        ) 
        WHERE id = ${projectId}
      `;
    }
    
    // If files are provided, associate them with the project
    let createdFiles = [];
    if (files && Array.isArray(files) && files.length > 0) {
      createdFiles = await Promise.all(
        files.map(async (file: { s3Key: string; filename: string }) => {
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
                // Update other fields if needed
              },
            });
          } else {
            // Create new file record
            return prisma.transcriptionFile.create({
              data: {
                s3Key: file.s3Key,
                filename: file.filename,
                size: 0, // This would ideally be set from the actual file size
                lastModified: new Date(),
                projectId: projectId,
              },
            });
          }
        })
      );
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