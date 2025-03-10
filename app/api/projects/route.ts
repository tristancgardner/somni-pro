import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for project creation/update
const projectSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required' }),
  description: z.string().optional(),
});

// GET - List all projects for the authenticated user
export async function GET() {
  try {
    // Authenticate the user
    const session = await getServerSession();
    console.log('GET /api/projects - Session:', session?.user?.email);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized - no valid session' },
        { status: 401 }
      );
    }

    // Find the user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    console.log('User found:', user?.id);

    if (!user) {
      // If user doesn't exist in database yet, create one
      try {
        const newUser = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || '',
            image: session.user.image || '',
          },
        });
        console.log('Created new user:', newUser.id);
        
        // Return empty projects array for new users
        return NextResponse.json({ projects: [] }, { status: 200 });
      } catch (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { message: 'Failed to create user' },
          { status: 500 }
        );
      }
    }

    // Get projects for this user
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { files: true }
        }
      }
    });

    console.log('Found projects:', projects.length);
    return NextResponse.json({ projects }, { status: 200 });
  } catch (error: any) {
    console.error('Error listing projects:', error);
    return NextResponse.json({ 
      message: 'Failed to list projects', 
      error: error.message 
    }, { status: 500 });
  }
}

// POST - Create a new project
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await getServerSession();
    console.log('POST /api/projects - Session:', session?.user?.email);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized - no valid session' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    
    // Validate the request body
    const validation = projectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid project data', errors: validation.error.format() },
        { status: 400 }
      );
    }

    // Find the user ID
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    // If user doesn't exist, create them
    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || '',
            image: session.user.image || '',
          },
        });
        console.log('Created new user:', user.id);
      } catch (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { message: 'Failed to create user' },
          { status: 500 }
        );
      }
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        name: validation.data.name,
        description: validation.data.description || '',
        userId: user.id,
      },
    });

    console.log('Created project:', project.id);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ 
      message: 'Failed to create project', 
      error: error.message 
    }, { status: 500 });
  }
} 