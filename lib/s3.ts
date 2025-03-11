import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Generate a pre-signed URL for downloading a file from S3
 * @param key The S3 object key
 * @param expiresIn Time in seconds before the URL expires
 * @returns Pre-signed URL for downloading the file
 */
export async function getFileDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Check if a file exists in the S3 bucket
 * @param key The S3 object key
 * @returns Boolean indicating if file exists
 */
export async function checkFileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
      Key: key
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the metadata for a file in S3
 * @param key The S3 object key
 * @returns File metadata or null if file doesn't exist
 */
export async function getFileMetadata(key: string): Promise<any | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
      Key: key
    });
    return await s3Client.send(command);
  } catch (error) {
    return null;
  }
} 