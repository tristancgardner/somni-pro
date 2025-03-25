import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * DELETE - Deletes a file from S3 and the database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileKey: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract file key from params
    const fileKey = decodeURIComponent(params.fileKey);
    if (!fileKey) {
      return NextResponse.json(
        { success: false, message: 'Invalid file data' },
        { status: 400 }
      );
    }

    console.log(`Deleting file with key: ${fileKey}`);

    // First, attempt to remove the file from any projects it's associated with
    try {
      await prisma.transcriptionFile.deleteMany({
        where: {
          s3Key: fileKey
        }
      });
    } catch (error) {
      console.error('Error removing file from projects:', error);
      // Continue with deletion even if this fails
    }

    // Delete from S3
    const bucket = process.env.S3_TRANSCRIBE_BUCKET || process.env.AWS_BUCKET_NAME;
    if (!bucket) {
      console.error("No S3 bucket name found in environment variables");
      return NextResponse.json(
        { success: false, message: 'S3 bucket configuration error' },
        { status: 500 }
      );
    }

    console.log(`Attempting to delete from bucket: ${bucket}, key: ${fileKey}`);
    
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: fileKey,
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: 'File deleted successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting file:', error);
    
    // Handle errors
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to delete file',
      },
      { status: 500 }
    );
  }
} 