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
    return Math.ceil(text.length / 4);
  }
}

// ------------------ LOG + EXTRACT OUTPUT ------------------
function logResponseOutput(label: string, output: any) {
  // Print the entire structure to see what the new "responses" API returned
  console.log(`--- Raw ${label} Output (full structure) ---`);
  console.log(JSON.stringify(output, null, 2));
  console.log(`---------------------------------`);
}

function extractContentRecursively(node: any): string {
  /*
    This function recursively walks the 'node':
    - If it's a string, return it.
    - If it has a 'content' field (and that's a string), return that.
    - If it's an array, recurse on each element and concatenate.
    - If it's an object, recurse on its values.
  */
  if (!node) return '';

  if (typeof node === 'string') {
    // Direct string
    return node;
  }

  if (Array.isArray(node)) {
    // Concatenate results of each item
    return node.map(extractContentRecursively).join('');
  }

  if (typeof node === 'object') {
    // If there's a direct 'content' field
    if (typeof node.content === 'string') {
      return node.content;
    }
    // Otherwise, recurse on each value in the object
    let combined = '';
    for (const key of Object.keys(node)) {
      combined += extractContentRecursively(node[key]);
    }
    return combined;
  }

  // Fallback
  return '';
}

// ------------------ EXTRACT JSON ------------------
function extractJson(rawText: string): string | null {
  // Strip code fences
  rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  // Attempt substring approach
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

// ------------------ 1) ROLE INFERENCE ------------------
async function labelSpeakers(
  fileName: string,
  transcript: any[],
  conversationType: string,
  knownSpeakers: Array<{ name: string; role: string; relevance: string }>,
  additionalNotes: string,
  speakerCount?: number
): Promise<Record<string, string>> {
  // Build a simplified version of the transcript
  const simplifiedSegments = transcript.map((seg) => ({
    speaker: seg.speaker || 'UNKNOWN_SPEAKER',
    text: seg.text,
  }));
  const segmentsStr = JSON.stringify(simplifiedSegments, null, 2);

  const systemPrompt = `
You are an assistant that assigns speaker roles in a transcript,
allowing multiple speakers to share the same role (including multiple Interviewees).
Return valid JSON only, with no extra text or markdown.
`.trim();

  let roleOptions = `"Participant" | "Other"`;
  if (conversationType.toLowerCase() === 'interview') {
    roleOptions = `"Interviewee" | "Interviewer" | "Other"`;
  }
  // Add support for other conversation types
  else if (conversationType.toLowerCase() === 'meeting') {
    roleOptions = `"Facilitator" | "Participant" | "Other"`;
  }
  else if (conversationType.toLowerCase() === 'podcast') {
    roleOptions = `"Host" | "Guest" | "Co-host" | "Other"`;
  }
  else if (conversationType.toLowerCase() === 'conversation') {
    roleOptions = `"Speaker A" | "Speaker B" | "Other"`;
  }

  const knownSpeakersStr = JSON.stringify(knownSpeakers, null, 2);
  
  // Add speakerCount to the prompt if provided
  const speakerCountInstruction = speakerCount 
    ? `There are EXACTLY ${speakerCount} unique individuals in this conversation. Multiple speaker labels may belong to the same person (diarization may have over-segmented speakers). Ensure your final result identifies exactly ${speakerCount} unique people, even if there are more speaker IDs.`
    : '';

  const userPrompt = `
Conversation type: "${conversationType}"

${speakerCountInstruction}

Use ${knownSpeakersStr} to infer roles and names if possible.

You must assign each speaker exactly one of: ${roleOptions}.
- Multiple speakers can be labeled "Interviewee" if appropriate.
- Do NOT merge or unify speakers; treat each speaker label independently.

Below is the diarized transcript:
${segmentsStr}

Return ONLY valid JSON in this shape:
{
  "${fileName}": {
    "SPEAKER_00": "Interviewee",
    "SPEAKER_01": "Interviewer",
    "SPEAKER_02": "Other"
  }
}
`.trim();

  const tokenCount = approximateTokenCount(userPrompt);
  console.log(`[Role Inference] tokens for ${fileName}: ${tokenCount}`);

  // Make request
  const response = await openai.responses.create({
    model: 'o3-mini-2025-01-31',
    instructions: systemPrompt,
    input: userPrompt,
    reasoning: { effort: 'high' },
  });

  // 1) Log the entire structure
  logResponseOutput('Role Inference', response.output);

  // 2) Recursively gather text from the structure
  const rawText = extractContentRecursively(response.output);

  console.log('--- Merged Role Inference Text ---');
  console.log(rawText);
  console.log('---------------------------------');

  const jsonStr = extractJson(rawText);
  if (!jsonStr) {
    console.error('No valid JSON for role labeling.');
    return {};
  }

  try {
    const data = JSON.parse(jsonStr);
    return data[fileName] || {};
  } catch (error) {
    console.error('Failed parsing role JSON:', error);
    return {};
  }
}

// ------------------ 2) NAME INFERENCE ------------------
async function inferNames(
  fileName: string,
  transcriptWithRoles: any[],
  userContext?: {
    conversationType: string;
    knownSpeakers?: Array<{ name: string; role: string; relevance: string }>;
    additionalNotes?: string;
    speakerCount?: number;
  }
): Promise<Record<string, string>> {
  // Build lines
  const lines = transcriptWithRoles.map((seg, i) => {
    const speaker = seg.speaker || 'UNKNOWN_SPEAKER';
    const role = seg.role || 'Other';
    const text = seg.text || '';
    return `Segment ${i} - ${speaker} (${role}): ${text}`;
  });
  const fullTranscriptStr = lines.join('\n\n');

  const systemPrompt = `
You are an assistant that infers real names from transcripts.
Return valid JSON only, with no extra text or markdown formatting.
`.trim();

  const knownSpeakers = userContext?.knownSpeakers || [];
  const contextBlock = knownSpeakers.length
    ? `Known speakers:\n${JSON.stringify(knownSpeakers, null, 2)}`
    : '';
    
  // Add speakerCount to the prompt if provided
  const speakerCountInstruction = userContext?.speakerCount 
    ? `There are EXACTLY ${userContext.speakerCount} unique individuals speaking in this conversation. 
The diarization process may have over-segmented speakers, meaning multiple speaker IDs might actually be the same person.

IMPORTANT CONSTRAINT: Your response must identify exactly ${userContext.speakerCount} unique people by name. 
If you see more speaker IDs than actual speakers, you MUST assign the same name to multiple speaker IDs.
For example, if there are 2 people but 5 speaker IDs, you might have:
SPEAKER_00: "John", SPEAKER_02: "John", SPEAKER_04: "John" (same person)
SPEAKER_01: "Mary", SPEAKER_03: "Mary" (same person)`
    : '';

  const userPrompt = `
We have a transcript (with roles assigned). Use the known speaker data if it helps.

${contextBlock}

${speakerCountInstruction}

Transcript:
${fullTranscriptStr}

Return valid JSON mapping speaker labels to names, e.g.:
{
  "SPEAKER_00": "Alice",
  "SPEAKER_01": "Bob", 
  "SPEAKER_02": "Alice"  // Note that SPEAKER_00 and SPEAKER_02 are the same person
}
`.trim();

  const tokenCount = approximateTokenCount(userPrompt);
  console.log(`[Name Inference] tokens for ${fileName}: ${tokenCount}`);

  const response = await openai.responses.create({
    model: 'o3-mini-2025-01-31',
    instructions: systemPrompt,
    input: userPrompt,
    reasoning: { effort: 'high' },
  });

  // 1) Log the entire structure
  logResponseOutput('Name Inference', response.output);

  // 2) Recursively gather text
  const rawText = extractContentRecursively(response.output);
  console.log('--- Merged Name Inference Text ---');
  console.log(rawText);
  console.log('---------------------------------');

  const jsonStr = extractJson(rawText);
  if (!jsonStr) {
    console.error('No valid JSON for name inference.');
    return {};
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed parsing name JSON:', error);
    return {};
  }
}

// ------------------ COMBINE MAP ------------------
function buildSpeakerMap(
  fileName: string,
  transcript: any[],
  speakerRoles: Record<string, string>,
  speakerNames: Record<string, string>
): Record<string, { role: string; name: string }> {
  const map: Record<string, { role: string; name: string }> = {};
  const uniqueSpeakers = new Set<string>();
  transcript.forEach((seg) => uniqueSpeakers.add(seg.speaker));

  uniqueSpeakers.forEach((label) => {
    const role = speakerRoles[label] || 'Other';
    const name = speakerNames[label] || 'Unknown';
    map[label] = { role, name };
  });

  return map;
}

// ------------------ POST HANDLER ------------------
export async function POST(request: Request) {
  const startTime = Date.now();
  console.log('[IdentifySpeakers] Request received at:', new Date().toISOString());
  
  try {
    const { fileName, transcript, userContext, speakerCount } = await request.json();
    if (!fileName || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Invalid request data. Must provide fileName + transcript array.' },
        { status: 400 }
      );
    }

    console.log(`[IdentifySpeakers] Processing file: ${fileName}, with ${transcript.length} segments`);
    console.log(`[IdentifySpeakers] Speaker count specified: ${speakerCount || 'not specified'}`);

    // Handle both string and object formats for backward compatibility
    let conversationType = 'Other';
    let knownSpeakers: Array<{ name: string; role: string; relevance: string }> = [];
    let additionalNotes = '';
    
    if (userContext) {
      if (typeof userContext === 'string') {
        console.log('[IdentifySpeakers] Using legacy string userContext');
        // Legacy format - simple string
        additionalNotes = userContext;
      } else {
        console.log('[IdentifySpeakers] Using structured userContext with type:', userContext.conversationType);
        // New structured format
        conversationType = userContext.conversationType || 'Other';
        knownSpeakers = userContext.knownSpeakers || [];
        additionalNotes = userContext.additionalNotes || '';
      }
    }

    // 1) Role inference
    console.log('[IdentifySpeakers] Starting role inference...');
    let speakerRoles = {};
    try {
      speakerRoles = await labelSpeakers(
        fileName,
        transcript,
        conversationType,
        knownSpeakers,
        additionalNotes,
        speakerCount
      );
      console.log('[IdentifySpeakers] Role inference completed successfully');
    } catch (error) {
      console.error('[IdentifySpeakers] Role inference failed:', error);
      return NextResponse.json({ 
        error: `Role inference failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }

    // 2) Attach roles
    const transcriptWithRoles = transcript.map((seg: any) => ({
      ...seg,
      role: typeof speakerRoles === 'object' && speakerRoles !== null && seg.speaker in speakerRoles 
        ? speakerRoles[seg.speaker as keyof typeof speakerRoles] 
        : 'Other',
    }));

    // 3) Name inference
    console.log('[IdentifySpeakers] Starting name inference...');
    let speakerNames = {};
    try {
      speakerNames = await inferNames(
        fileName,
        transcriptWithRoles,
        {
          conversationType,
          knownSpeakers,
          additionalNotes,
          speakerCount
        }
      );
      console.log('[IdentifySpeakers] Name inference completed successfully');
    } catch (error) {
      console.error('[IdentifySpeakers] Name inference failed:', error);
      return NextResponse.json({ 
        error: `Name inference failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }

    // 4) Combine
    const speakerLabels = buildSpeakerMap(
      fileName,
      transcript,
      speakerRoles,
      speakerNames
    );

    const totalTime = Date.now() - startTime;
    console.log(`[IdentifySpeakers] Request completed in ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      speakerLabels,
      processingTimeMs: totalTime
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[IdentifySpeakers] Error (after ${totalTime}ms):`, error);
    return NextResponse.json({ 
      error: `Failed to identify speakers: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
