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
  additionalNotes: string
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

  const knownSpeakersStr = JSON.stringify(knownSpeakers, null, 2);

  const userPrompt = `
Conversation type: "${conversationType}"
Known speakers (from user):
${knownSpeakersStr}

Additional notes:
${additionalNotes}

You must assign each speaker exactly one of: ${roleOptions}.
- Multiple speakers can be labeled "Interviewee" if appropriate.
- Do NOT merge or unify speakers; treat each speaker label independently.

Below is the diarized transcript:
${segmentsStr}

Return ONLY valid JSON in this shape:
{
  "${fileName}": {
    "SPEAKER_00": "Interviewee",
    "SPEAKER_01": "Interviewee",
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

  const userPrompt = `
We have a transcript (with roles assigned). Use the known speaker data if it helps.

${contextBlock}

Transcript:
${fullTranscriptStr}

Return valid JSON mapping speaker labels to names, e.g.:
{
  "SPEAKER_00": "Alice",
  "SPEAKER_01": "Bob",
  "SPEAKER_02": "Unknown"
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
  try {
    const { fileName, transcript, userContext } = await request.json();
    if (!fileName || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Invalid request data. Must provide fileName + transcript array.' },
        { status: 400 }
      );
    }

    const conversationType = userContext?.conversationType || 'Other';
    const knownSpeakers = userContext?.knownSpeakers || [];
    const additionalNotes = userContext?.additionalNotes || '';

    // 1) Role inference
    const speakerRoles = await labelSpeakers(
      fileName,
      transcript,
      conversationType,
      knownSpeakers,
      additionalNotes
    );
    console.log('speakerRoles:', speakerRoles);

    // 2) Attach roles
    const transcriptWithRoles = transcript.map((seg: any) => ({
      ...seg,
      role: speakerRoles[seg.speaker] || 'Other',
    }));

    // 3) Name inference
    const speakerNames = await inferNames(
      fileName,
      transcriptWithRoles,
      userContext
    );
    console.log('speakerNames:', speakerNames);

    // 4) Combine
    const speakerLabels = buildSpeakerMap(
      fileName,
      transcript,
      speakerRoles,
      speakerNames
    );

    return NextResponse.json({
      success: true,
      speakerLabels,
    });
  } catch (error) {
    console.error('Error in identify-speakers route:', error);
    return NextResponse.json({ error: 'Failed to identify speakers.' }, { status: 500 });
  }
}
