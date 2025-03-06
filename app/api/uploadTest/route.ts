import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// Initialize the S3 client with your env variables
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('Starting file upload process...');
    
    // Use FormData instead of formidable
    const formData = await request.formData();
    
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

    // Upload to S3 (use "input/" folder prefix)
    const s3Key = `input/${file.name}`;
    console.log('Starting S3 upload to:', s3Key);
    
    const uploadResult = await s3
      .upload({
        Bucket: process.env.S3_INPUT_BUCKET!,
        Key: s3Key,
        Body: fileStream,
      })
      .promise();

    console.log('Upload success:', uploadResult.Location);
    
    // Clean up the temporary file
    fs.promises.unlink(tempFilePath).catch(err => {
      console.warn('Error deleting temporary file:', err);
    });

    return NextResponse.json(
      { message: 'File uploaded successfully!', location: uploadResult.Location },
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