import AWS from 'aws-sdk';

// Initialize AWS S3 client
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

/**
 * Generate a pre-signed URL for downloading a file from S3
 * @param key The S3 object key
 * @param expiresIn Time in seconds before the URL expires
 * @returns Pre-signed URL for downloading the file
 */
export function getFileDownloadUrl(key: string, expiresIn: number = 3600): string {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
    Key: key,
    Expires: expiresIn // Default: 1 hour
  });
}

/**
 * Check if a file exists in the S3 bucket
 * @param key The S3 object key
 * @returns Boolean indicating if file exists
 */
export async function checkFileExists(key: string): Promise<boolean> {
  try {
    await s3.headObject({
      Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
      Key: key
    }).promise();
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
export async function getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput | null> {
  try {
    return await s3.headObject({
      Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
      Key: key
    }).promise();
  } catch (error) {
    return null;
  }
} 