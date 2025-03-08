import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

export async function POST(request: NextRequest) {
  try {
    // Get the user session for authentication
    const session = await getServerSession();
    if (!session) {
      console.error('No valid session found');
      return NextResponse.json(
        { message: 'Unauthorized - no valid session' },
        { status: 401 }
      );
    }

    // Get the URL from the request body
    const { jsonUrl } = await request.json();
    
    if (!jsonUrl) {
      return NextResponse.json({ message: 'No URL provided' }, { status: 400 });
    }
    
    console.log('Fetching transcription from:', jsonUrl);
    
    // Fetch the transcription JSON from the provided URL
    const response = await fetch(jsonUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transcription: ${response.status} ${response.statusText}`);
    }
    
    // Parse the JSON response
    const transcriptionData = await response.json();
    
    return NextResponse.json(transcriptionData, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json({ 
      message: 'Failed to fetch transcription', 
      error: error.message 
    }, { status: 500 });
  }
} 