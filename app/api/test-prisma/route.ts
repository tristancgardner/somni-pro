import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Test if we can connect to the database and get a count of users
    const userCount = await prisma.user.count();
    
    return NextResponse.json({ 
      message: 'Prisma client connected to database successfully',
      userCount,
      databaseUrl: process.env.POSTGRES_PRISMA_URL?.replace(/:[^:]*@/, ':****@') // Hide password
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error connecting to database:', error);
    return NextResponse.json({ 
      message: 'Failed to connect to database', 
      error: error.message 
    }, { status: 500 });
  }
} 