import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper to get transcript
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // Get the file from S3
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    const body = await response.Body?.transformToString();

    if (!body) {
      return NextResponse.json({ error: 'File is empty or could not be read' }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(body));
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
  }
}

// Helper to update transcript
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key, transcript } = await request.json();

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript data is required' }, { status: 400 });
    }

    // First get the existing file
    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    const getResponse = await s3Client.send(getCommand);
    const existingBody = await getResponse.Body?.transformToString();

    if (!existingBody) {
      return NextResponse.json({ error: 'File is empty or could not be read' }, { status: 404 });
    }

    // Parse the existing data
    const existingData = JSON.parse(existingBody);
    
    // Update the transcript data
    existingData.transcript = transcript;

    // Save back to S3
    const putCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(existingData, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);

    return NextResponse.json({ success: true, message: 'Transcript updated successfully' });
  } catch (error) {
    console.error('Error updating transcript:', error);
    return NextResponse.json({ error: 'Failed to update transcript' }, { status: 500 });
  }
} 