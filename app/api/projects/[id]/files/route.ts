import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import AWS from 'aws-sdk';
import { getFileDownloadUrl } from '@/lib/s3';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`GET /api/projects/${params.id}/files - Starting request`);
    
    // Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('Authentication failed - no valid user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the project ID from the URL params
    const { id: projectId } = params;
    console.log(`Project ID: ${projectId}`);
    
    // Parse the URL to get the search parameters
    const url = new URL(request.url);
    const keysParam = url.searchParams.get('keys');
    
    // Check if we should provide all project files
    if (!keysParam) {
      console.log('No keys parameter provided - returning all project files');
      
      // Query for all files in this project
      const files = await prisma.transcriptionFile.findMany({
        where: { projectId },
        select: {
          id: true,
          s3Key: true,
          filename: true,
          size: true,
          lastModified: true,
        },
        orderBy: {
          filename: 'asc'
        }
      });
      
      // Get project name
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, id: true }
      });

      if (!project) {
        console.log(`Project not found: ${projectId}`);
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      console.log(`Found ${files.length} files for project ${project.name}`);

      if (files.length === 0) {
        return NextResponse.json({
          projectId: project.id,
          projectName: project.name,
          files: []
        });
      }

      // Generate URLs for all files in the project
      const filesWithUrls = await Promise.all(
        files.map(async (file) => {
          const downloadUrl = s3.getSignedUrl('getObject', {
            Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
            Key: file.s3Key,
            Expires: 3600 // 1 hour
          });
          
          return {
            key: file.s3Key,
            filename: file.filename,
            size: file.size,
            downloadUrl,
            lastModified: file.lastModified,
          };
        })
      );

      console.log(`Generated download URLs for ${filesWithUrls.length} files`);

      return NextResponse.json({
        projectId: project.id,
        projectName: project.name,
        files: filesWithUrls,
      });
    }

    // Parse the keys from the URL parameter - handle decoding carefully
    let fileKeys: string[];
    try {
      console.log(`Raw keys parameter: ${keysParam}`);
      const decodedParam = decodeURIComponent(keysParam);
      console.log(`Decoded keys parameter: ${decodedParam}`);
      
      fileKeys = JSON.parse(decodedParam);
      
      if (!Array.isArray(fileKeys)) {
        throw new Error('Keys parameter is not an array');
      }
      
      // Handle @ symbols in the file keys - try multiple possible encodings
      fileKeys = fileKeys.map(key => {
        // First unescape any URI components that might be double-encoded
        let fixedKey = key;
        
        // Replace common encodings of @ with the actual symbol
        fixedKey = fixedKey.replace(/(%40|\$40|%2540)/g, '@');
        
        // Log the transformation for debugging
        if (fixedKey !== key) {
          console.log(`Transformed key: "${key}" -> "${fixedKey}"`);
        }
        
        return fixedKey;
      });
      
      console.log('Processed file keys:', fileKeys);
    } catch (error) {
      console.error('Error parsing file keys:', error, keysParam);
      return NextResponse.json({ 
        error: 'Invalid file keys format',
        details: error instanceof Error ? error.message : 'Unknown parsing error'
      }, { status: 400 });
    }

    // Verify the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      console.log(`Project not found: ${projectId}`);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the files that match the provided keys and belong to the project
    console.log(`Querying TranscriptionFile with S3 keys: ${JSON.stringify(fileKeys)}`);
    const files = await prisma.transcriptionFile.findMany({
      where: {
        s3Key: { in: fileKeys },
        projectId
      },
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

    console.log(`Found ${files.length} matching files in the database`);
    
    // Check if we found all the expected files
    if (files.length === 0) {
      console.log('No matching files found');
      return NextResponse.json({ 
        error: 'No files found matching the provided keys',
        requestedKeys: fileKeys
      }, { status: 404 });
    }
    
    if (files.length !== fileKeys.length) {
      console.log(`Warning: Found ${files.length} files but expected ${fileKeys.length}`);
      
      // Log which keys were not found
      const foundKeys = files.map(f => f.s3Key);
      const missingKeys = fileKeys.filter(key => !foundKeys.includes(key));
      console.log('Missing keys:', missingKeys);
    }

    // Generate download URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        // Generate signed URL directly (don't use the imported function as it might have issues)
        const downloadUrl = s3.getSignedUrl('getObject', {
          Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
          Key: file.s3Key,
          Expires: 3600 // 1 hour
        });
        
        return {
          key: file.s3Key,
          filename: file.filename,
          size: file.size,
          downloadUrl,
          lastModified: file.lastModified,
        };
      })
    );

    console.log(`Generated download URLs for ${filesWithUrls.length} files`);

    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      files: filesWithUrls,
    });
  } catch (error) {
    console.error('Error fetching project files:', error);
    return NextResponse.json(
      { error: 'Failed to load project files', details: (error as Error).message },
      { status: 500 }
    );
  }
} 