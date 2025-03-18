import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { downloadUrl } = await request.json();

    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'No downloadUrl provided' },
        { status: 400 }
      );
    }

    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch transcript: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
} 