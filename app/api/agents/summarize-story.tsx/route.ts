import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { encode } from 'gpt-tokenizer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ------------------ TOKEN COUNT ------------------
function approximateTokenCount(text: string): number {
  try {
    return encode(text).length;
  } catch (error) {
    console.error('Error calculating token count:', error);
    // fallback estimate: ~4 chars per token
    return Math.ceil(text.length / 4);
  }
}

// ------------------ LOG + EXTRACT OUTPUT ------------------
function logResponseOutput(label: string, output: any) {
  console.log(`--- Raw ${label} Output (full structure) ---`);
  console.log(JSON.stringify(output, null, 2));
  console.log('------------------------------------------');
}

function extractContentRecursively(node: any): string {
  /*
    Recursively walk the node:
    - If it's a string, return it.
    - If it has a 'content' field, return that.
    - If it's an array, recurse each element and concat.
    - If it's an object, recurse all its values.
  */
  if (!node) return '';

  if (typeof node === 'string') {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(extractContentRecursively).join('');
  }

  if (typeof node === 'object') {
    if (typeof node.content === 'string') {
      return node.content;
    }
    let combined = '';
    for (const key of Object.keys(node)) {
      combined += extractContentRecursively(node[key]);
    }
    return combined;
  }

  return '';
}

// ------------------ EXTRACT JSON ------------------
function extractJson(rawText: string): string | null {
  // Remove code fences if any
  rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Try substring approach
  const startIndex = rawText.indexOf('{');
  const endIndex = rawText.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const possibleJson = rawText.substring(startIndex, endIndex + 1).trim();
    if (possibleJson.startsWith('{') && possibleJson.endsWith('}')) {
      return possibleJson;
    }
  }

  // Regex fallback
  const match = rawText.match(/(\{[\s\S]*\})/);
  return match ? match[1].trim() : null;
}

// ------------------ SUMMARIZE LOGIC ------------------
async function summarizeTranscript(
  fileName: string,
  transcript: Array<{ speaker?: string; text: string }>,
  userContext: string,
  mode: 'summarization' | 'storyline'
): Promise<any> {
  // 1) Word-count check
  let totalWords = 0;
  transcript.forEach((seg) => {
    totalWords += seg.text.split(/\s+/).filter(Boolean).length;
  });
  if (totalWords < 9) {
    // Return minimal JSON if too short
    return {
      [fileName]: {
        summary: 'No valuable story content.',
        themes: [],
        key_speakers: {},
      },
    };
  }

  // 2) Build a small map of speaker => name placeholder
  // (If you have actual names, you can pass them in userContext or additional logic.)
  const speakerSet = new Set<string>();
  transcript.forEach((seg) => {
    if (seg.speaker) speakerSet.add(seg.speaker);
  });
  const speakerMap: Record<string, string> = {};
  speakerSet.forEach((sp) => {
    speakerMap[sp] = 'Unknown';
  });

  const systemPrompt = `
You are an assistant that generates a structured summary or storyline from a transcript.
Return valid JSON only, with no extra text or markdown.
`.trim();

  // 3) Construct user prompt
  const simplifiedSegments = JSON.stringify(transcript, null, 2);

  const contextLine = userContext.trim()
    ? `Additional known context:\n${userContext.trim()}\n\n`
    : '';

  const userPrompt = `
Mode: "${mode}"
${contextLine}

Transcript (speaker + text):
${simplifiedSegments}

If mode is "summarization", produce a concise, factual summary.
If mode is "storyline", produce a creative, thematic storyline.

Your JSON output must match exactly:

{
  "${fileName}": {
    "summary": "...",
    "themes": ["theme1", "theme2"],
    "key_speakers": ${JSON.stringify(speakerMap, null, 2)}
  }
}
`.trim();

  // 4) Token count for debugging
  const tokenCount = approximateTokenCount(userPrompt);
  console.log(`[Summarize] tokens for ${fileName}: ${tokenCount}`);

  // 5) Make the request
  const response = await openai.responses.create({
    model: 'o3-mini-2025-01-31', // or your model name
    instructions: systemPrompt,
    input: userPrompt,
    reasoning: { effort: 'high' },
  });

  // 6) Log full structure
  logResponseOutput('Narrative Summarization', response.output);

  // 7) Combine text
  const rawText = extractContentRecursively(response.output);
  console.log('--- Merged Summarization Text ---');
  console.log(rawText);
  console.log('----------------------------------');

  // 8) Attempt to extract JSON
  const jsonStr = extractJson(rawText);
  if (!jsonStr) {
    console.error('No valid JSON extracted for summary.');
    return {};
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed parsing summary JSON:', error);
    return {};
  }
}

// ------------------ POST HANDLER ------------------
export async function POST(request: Request) {
  try {
    const { fileName, transcript, userContext, mode } = await request.json();

    // Basic validation
    if (!fileName || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Must provide fileName + transcript[] in request body.' },
        { status: 400 }
      );
    }

    // Convert mode to either 'summarization' or 'storyline'
    const finalMode: 'summarization' | 'storyline' =
      mode === 'storyline' ? 'storyline' : 'summarization';

    // Summarize
    const summaryJson = await summarizeTranscript(
      fileName,
      transcript,
      userContext || '',
      finalMode
    );

    return NextResponse.json({
      success: true,
      summaryJson,
    });
  } catch (error) {
    console.error('Error in narrative-summarization route:', error);
    return NextResponse.json({ error: 'Failed to summarize transcript.' }, { status: 500 });
  }
}
