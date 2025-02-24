import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const directoryPath = path.join(process.cwd(), 'public', 'json-transcription');
    const files = fs.readdirSync(directoryPath)
      .filter(file => file.endsWith('.json'));
    
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json({ files: [] }, { status: 500 });
  }
} 