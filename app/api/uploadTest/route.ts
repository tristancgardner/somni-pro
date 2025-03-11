import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// Initialize the S3 client with your env variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    console.log('Starting file upload process...');
    
    // Parse form data
    const formData = await request.formData();
    
    // Get userEmail and sessionId from form data
    const userEmail = formData.get('userEmail') as string;
    const sessionId = formData.get('sessionId') as string;
    
    // Validate userEmail and sessionId
    if (!userEmail || !sessionId) {
      // Fallback to session if not provided in form data
      const session = await getServerSession();
      if (!session) {
        console.error('No valid session found and no userEmail/sessionId provided');
        return NextResponse.json(
          { message: 'Unauthorized - no valid session' },
          { status: 401 }
        );
      }
      
      // Use email from session if available
      if (!userEmail && session.user?.email) {
        console.log('Using email from session:', session.user.email);
      }
    }
    
    // Use provided values or fallbacks
    const userId = userEmail || 'unknown-user';
    const sId = sessionId || `fallback-${Date.now()}`;
    
    console.log('User email for upload:', userId);
    console.log('Session ID for upload:', sId);
    
    // Get the file from the FormData
    const file = formData.get('testFile') as File;
    if (!file) {
      console.error('No file found in the request');
      return NextResponse.json({ message: 'No file found' }, { status: 400 });
    }
    
    console.log('File received:', { 
      filename: file.name, 
      size: file.size, 
      type: file.type 
    });
    
    // Create a temporary file path
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${uuidv4()}_${file.name}`);
    
    // Convert the file to a buffer and write to a temporary file
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, fileBuffer);
    console.log('File saved temporarily at:', tempFilePath);
    
    // Create a file stream from the temp file
    const fileStream = fs.createReadStream(tempFilePath);

    // Build a user-specific S3 key with sessionId
    const s3Key = `input/${userId}/${sId}/${file.name}`;
    console.log('Starting S3 upload to:', s3Key);
    
    // Get the file content to upload
    const fileContent = await fs.promises.readFile(tempFilePath);
    
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
      Key: s3Key,
      Body: fileContent,
    });
    
    const uploadResult = await s3Client.send(uploadCommand);

    console.log('Upload success to:', s3Key);
    
    // Clean up the temporary file
    fs.promises.unlink(tempFilePath).catch(err => {
      console.warn('Error deleting temporary file:', err);
    });

    return NextResponse.json(
      { 
        message: 'File uploaded successfully!', 
        location: `https://${process.env.S3_TRANSCRIBE_BUCKET!}.s3.${process.env.AWS_REGION!}.amazonaws.com/${s3Key}`,
        s3Path: `s3://${process.env.S3_TRANSCRIBE_BUCKET!}/${s3Key}`
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      message: 'Upload failed', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
} 