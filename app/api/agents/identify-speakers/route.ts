import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { encode } from 'gpt-tokenizer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Count tokens
function approximateTokenCount(text: string): number {
  try {
    return encode(text).length;
  } catch (error) {
    console.error('Error calculating token count:', error);
    // Fallback
    return Math.ceil(text.length / 4);
  }
}

// Extract JSON
function extractJson(rawText: string): string | null {
  // Remove any code fences first
  rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const match = rawText.match(/(\{[\s\S]*\})/);
  return match ? match[1].trim() : null;
}

// 1) Role inference
async function labelSpeakers(
  fileName: string,
  transcript: any[],
  userContext?: string
): Promise<Record<string, string>> {
  const simplifiedSegments = transcript.map((seg) => ({
    speaker: seg.speaker || "UNKNOWN_SPEAKER",
    text: seg.text,
  }));
  
  const segmentsStr = JSON.stringify(simplifiedSegments, null, 2);

  // System prompt => instructions
  const systemPrompt = `
You are an assistant that assigns roles to speakers in a video transcript.
Return valid JSON only, with no extra text or Markdown formatting.
`.trim();

  // Optional context
  const contextBlock = userContext
    ? `Additional context about potential speakers:\n${userContext}`
    : '';

  // User prompt => input
  const userPrompt = `
You are analyzing a JSON transcript of a video interview with multiple speakers.

${contextBlock}

Your task: assign exactly one of these roles to each speaker:
  - "Interviewee"
  - "Interviewer"
  - "Other"

It's possible for multiple speakers to share the same role. The interviewer usually talks the least and asks questions.

Below are ordered segments from the transcript:
${segmentsStr}

Return ONLY valid JSON in this format:
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

  // Call the new "responses" API with the o3-mini-2025-01-31
  const response = await openai.responses.create({
    model: "o3-mini-2025-01-31",
    instructions: systemPrompt,
    input: userPrompt,
    reasoning: {
      effort: "high",
    //   generate_summary: "concise",
    },
  });

  // The new API returns `response.output` instead of `choices[0].message.content`
  let rawText = '';
  if (response.output) {
    rawText = String(response.output);
  }
  const jsonStr = extractJson(rawText);

  if (!jsonStr) {
    console.error("No valid JSON for role labeling.");
    return {};
  }

  try {
    const roleData = JSON.parse(jsonStr);
    return roleData[fileName] || {};
  } catch (error) {
    console.error("Failed parsing role JSON:", error);
    return {};
  }
}

// 2) Name inference
async function inferNames(
  fileName: string,
  transcriptWithRoles: any[],
  userContext?: string
): Promise<Record<string, string>> {
  // Build lines
  const lines = transcriptWithRoles.map((seg, i) => {
    const speaker = seg.speaker || "UNKNOWN_SPEAKER";
    const role = seg.role || "Unknown";
    const text = seg.text || "";
    return `Segment ${i}\n${speaker} (${role}): ${text}`;
  });
  
  const fullTranscriptStr = lines.join("\n\n");

  // System-level instructions
  const systemPrompt = `
You are an assistant that infers real names from transcripts.
Return valid JSON only, with no extra text or Markdown formatting.
`.trim();

  const contextBlock = userContext
    ? `We know these possible speakers or roles:\n${userContext}`
    : '';

  // User-level instructions
  const userPrompt = `
We have a transcript of a video interview, including speaker labels, roles, and text.

${contextBlock}

If the user included the name of the INTERVIEWER, apply that name to whoever has the role "Interviewer".
If a speaker is labeled "UNKNOWN" or "UNKNOWN_SPEAKER" but might match one of the known individuals, update it. Otherwise, leave "Unknown".

Return valid JSON like:
{
  "SPEAKER_00": "Michael",
  "SPEAKER_01": "Tristan G",
  "SPEAKER_02": "Unknown"
}

Transcript:
---START---
${fullTranscriptStr}
---END---
`.trim();

  const tokenCount = approximateTokenCount(userPrompt);
  console.log(`[Name Inference] tokens for ${fileName}: ${tokenCount}`);

  const response = await openai.responses.create({
    model: "o3-mini-2025-01-31",
    instructions: systemPrompt,
    input: userPrompt,
    reasoning: {
      effort: "high",
    //   generate_summary: "concise",
    },
  });

  let rawText = '';
  if (response.output) {
    rawText = String(response.output);
  }
  const jsonStr = extractJson(rawText);

  if (!jsonStr) {
    console.error("No valid JSON for name inference.");
    return {};
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed parsing name JSON:", error);
    return {};
  }
}

// Combine roles + names
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
    const role = speakerRoles[label] || "Other";
    let name = speakerNames[label] || "Unknown";

    // Force Interviewer => "Interviewer" name
    // if (role.toLowerCase() === "interviewer") {
    //   role = "Interviewer";
    // }
    map[label] = { role, name };
  });

  return map;
}

// ---------- POST Handler -------------
export async function POST(request: Request) {
  try {
    const { fileName, transcript, userContext } = await request.json();

    if (!fileName || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: "Invalid request data. Must provide fileName + transcript array." },
        { status: 400 }
      );
    }
  
    // 1) Role
    const speakerRoles = await labelSpeakers(fileName, transcript, userContext);
    console.log("speakerRoles:", speakerRoles);

    // 2) Build transcript with roles
    const transcriptWithRoles = transcript.map((seg: any) => ({
      ...seg,
      role: speakerRoles[seg.speaker] || "Other"
    }));

    // 3) Names
    const speakerNames = await inferNames(fileName, transcriptWithRoles, userContext);
    console.log("speakerNames:", speakerNames);

    // 4) Combine
    const speakerLabels = buildSpeakerMap(fileName, transcript, speakerRoles, speakerNames);

    // 5) Return minimal mapping
    return NextResponse.json({
      success: true,
      speakerLabels
    });
  } catch (error) {
    console.error("Error in identify-speakers route:", error);
    return NextResponse.json(
      { error: "Failed to identify speakers." },
      { status: 500 }
    );
  }
}
