import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { encode } from 'gpt-tokenizer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Count tokens to avoid overflows
function approximateTokenCount(text: string): number {
  try {
    return encode(text).length;
  } catch (error) {
    console.error('Error calculating token count:', error);
    // Fallback if encoding fails
    return Math.ceil(text.length / 4);
  }
}

// Safely extract JSON from GPT response text
function extractJson(rawText: string): string | null {
  rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  // Regex for a JSON object
  const match = rawText.match(/(\{[\s\S]*\})/);
  return match ? match[1].trim() : null;
}

// 1) Role inference (Interviewer, Interviewee, Other)
async function labelSpeakers(
  fileName: string, 
  transcript: any[],
  userContext?: string
): Promise<Record<string, string>> {
  const simplifiedSegments = transcript.map((seg) => ({
    speaker: seg.speaker,
    text: seg.text,
  }));
  
  const segmentsStr = JSON.stringify(simplifiedSegments, null, 2);

  const contextBlock = userContext
    ? `Additional context about the interview or speakers:\n${userContext}\n\n`
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

// 2) Name inference after we have roles assigned
async function inferNames(
  fileName: string,
  transcriptWithRoles: any[],
  userContext?: string
): Promise<Record<string, string>> {
  // We build each segment line
  const lines = transcriptWithRoles.map((seg, i) => {
    // If the speaker label is "UNKNOWN", we still include it—GPT might rename it.
    const speaker = seg.speaker || "UNKNOWN_SPEAKER";
    const role = seg.role || "Unknown";
    const text = seg.text || "";
    return `Segment ${i}\n${speaker} (${role}): ${text}`;
  });
  
  const fullTranscriptStr = lines.join("\n\n");

  // We add stronger instructions about ignoring "UNKNOWN" speaker labels
  const contextBlock = userContext
    ? `Additional context about the speakers:\n${userContext}\n\n`
    : '';

  const prompt = `
    We have a full transcript of a video interview, including speaker labels, roles, and their text.

    ${contextBlock}

    IMPORTANT: 
    - If you see a speaker label named "UNKNOWN" (or "UNKNOWN_SPEAKER"), do NOT assume it must remain Unknown. 
      Use the context above to see if this speaker might be "Michael Smith," "Tristan G," or any other known name.
    - Only leave a name as "Unknown" if there is truly not enough information to identify it.

    Your task:
      - Determine the real name of each speaker if it can be inferred from context or user instructions.
      - If truly unknown, use "Unknown".

    Return only valid JSON. For example:
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

// Combine roles + names into a single object
function buildSpeakerMap(
  fileName: string,
  transcript: any[],
  speakerRoles: Record<string, string>,
  speakerNames: Record<string, string>
): Record<string, { role: string; name: string }> {
  const map: Record<string, { role: string; name: string }> = {};

  // Gather unique speaker labels
  const uniqueSpeakers = new Set<string>();
  transcript.forEach((seg) => uniqueSpeakers.add(seg.speaker));

  uniqueSpeakers.forEach((label) => {
    const role = speakerRoles[label] || "Other";
    let name = speakerNames[label] || "Unknown";

    // If role is "Interviewer", forcibly set name to "Interviewer" if GPT didn't
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
  
    // 1) Role inference
    const speakerRoles = await labelSpeakers(fileName, transcript, userContext);
    console.log("speakerRoles:", speakerRoles);

    // 2) Build a "transcript with roles"
    const transcriptWithRoles = transcript.map((seg: any) => ({
      ...seg,
      role: speakerRoles[seg.speaker] || "Other"
    }));

    // 3) Name inference
    const speakerNames = await inferNames(fileName, transcriptWithRoles, userContext);
    console.log("speakerNames:", speakerNames);

    // 4) Combine into one speaker mapping
    const speakerLabels = buildSpeakerMap(fileName, transcript, speakerRoles, speakerNames);

    // 5) Return only the minimal mapping: SPEAKER_XX -> { role, name }
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
