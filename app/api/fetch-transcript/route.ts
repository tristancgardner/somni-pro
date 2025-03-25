import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

export async function POST(request: NextRequest) {
  try {
    // 1. Get the downloadUrl from the request body
    const { downloadUrl } = await request.json();
    
    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'Missing downloadUrl parameter' },
        { status: 400 }
      );
    }
    
    // 2. Authenticate user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - no valid session' },
        { status: 401 }
      );
    }
    
    // 3. Fetch the transcript using the server
    // This avoids CORS issues that occur when fetching directly from the browser
    console.log(`Server fetching transcript from: ${downloadUrl}`);
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch transcript: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // 4. Parse and return the transcript data
    const transcriptData = await response.json();
    
    return NextResponse.json(transcriptData, { status: 200 });
    
  } catch (error: any) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch transcript', 
      details: error.message
    }, { status: 500 });
  }
} 