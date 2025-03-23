import { NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { projectId, fileName, fileType } = await request.json()

    // Validate input
    if (!projectId || !fileName || !fileType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the project belongs to the user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Create a unique file key
    const fileKey = `projects/${projectId}/${Date.now()}-${fileName}`

    // Create the presigned URL
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.S3_TRANSCRIBE_BUCKET!,
      Key: fileKey,
      ContentType: fileType,
    })

    const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 3600, // URL expires in 1 hour
    })

    // Create a file record in the database
    await prisma.file.create({
      data: {
        name: fileName,
        key: fileKey,
        type: fileType,
        size: 0, // Will be updated after upload
        projectId,
        status: "pending",
        userId: user.id,
      },
    })

    return NextResponse.json({ uploadUrl, fileKey })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 })
  }
} 