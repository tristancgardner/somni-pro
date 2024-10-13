import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'V40914AB1_1of2_GT.rttm');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return NextResponse.json({ content: fileContent });
}
