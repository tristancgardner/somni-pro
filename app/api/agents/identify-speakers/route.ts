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

  const contextBlock = userContext
    ? `Additional context about possible speakers:\n${userContext}\n\n`
    : '';

  const prompt = `
    You are analyzing a JSON transcript of a video interview with multiple speakers (SPEAKER_00, SPEAKER_01, etc.).
    
    ${contextBlock}

    Your task: assign exactly one of these roles to each speaker:
      - "Interviewee"
      - "Interviewer"
      - "Other"

    Below is the JSON transcript. Return only valid JSON with no extra text:
    ${segmentsStr}

    Return it in this format:
    {
      "${fileName}": {
        "SPEAKER_00": "Interviewee",
        "SPEAKER_01": "Interviewer",
        "SPEAKER_02": "Other"
      }
    }
  `.trim();

  const tokenCount = approximateTokenCount(prompt);
  console.log(`[Role Inference] tokens for ${fileName}: ${tokenCount}`);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  const rawText = response.choices[0].message.content?.trim() || '';
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

  // Simpler prompt that references userContext for known people
  const contextBlock = userContext
    ? `We know these possible speakers or roles:\n${userContext}\n\n`
    : '';

  const prompt = `
    We have a transcript of a video interview, including speaker labels, roles, and text.

    ${contextBlock}

    If you see a speaker labeled "UNKNOWN" or "UNKNOWN_SPEAKER", 
    it might match one of the known individuals above, 
    or it may remain "Unknown" if there's insufficient info.

    Your task:
      - Determine the real name of each speaker if it can be inferred from context or user instructions.
      - If truly unknown, use "Unknown".

    Return valid JSON like:
    {
      "SPEAKER_00": "Michael",
      "UNKNOWN_SPEAKER": "Tristan G",
      "SPEAKER_02": "Unknown"
    }

    Transcript:
    ---START---
    ${fullTranscriptStr}
    ---END---
  `.trim();

  const tokenCount = approximateTokenCount(prompt);
  console.log(`[Name Inference] tokens for ${fileName}: ${tokenCount}`);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 1,
  });

  const rawText = response.choices[0].message.content?.trim() || '';
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
    if (role.toLowerCase() === "interviewer") {
      name = "Interviewer";
    }
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
