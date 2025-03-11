import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getFileDownloadUrl } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;
    const url = new URL(request.url);
    const keysParam = url.searchParams.get('keys');
    
    if (!keysParam) {
      return NextResponse.json({ error: 'No file keys provided' }, { status: 400 });
    }

    // Parse the keys from the URL parameter
    let fileKeys: string[];
    try {
      fileKeys = JSON.parse(decodeURIComponent(keysParam));
      if (!Array.isArray(fileKeys)) {
        throw new Error('Keys parameter is not an array');
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid file keys format' }, { status: 400 });
    }

    // Verify the project exists and belongs to the user
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If no specific keys are provided or the array is empty, get all files from the project
    const whereClause = fileKeys.length > 0 
      ? { 
          s3Key: { in: fileKeys },
          projectId 
        } 
      : { projectId };

    // Get the files that match the provided keys and belong to the project
    const files = await prisma.file.findMany({
      where: whereClause,
      select: {
        id: true,
        s3Key: true,
        filename: true,
        size: true,
        lastModified: true,
      },
      orderBy: {
        filename: 'asc', // Sort files alphabetically by filename
      },
    });

    // Generate download URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const downloadUrl = await getFileDownloadUrl(file.s3Key);
        return {
          key: file.s3Key,
          filename: file.filename,
          size: file.size,
          downloadUrl,
          lastModified: file.lastModified,
        };
      })
    );

    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      files: filesWithUrls,
    });
  } catch (error) {
    console.error('Error fetching project files:', error);
    return NextResponse.json(
      { error: 'Failed to load project files' },
      { status: 500 }
    );
  }
} 