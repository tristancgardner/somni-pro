import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { encode } from 'gpt-tokenizer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 1) Count tokens to avoid overflows
function approximateTokenCount(text: string): number {
  try {
    return encode(text).length;
  } catch (error) {
    console.error('Error calculating token count:', error);
    // Fallback to rough estimation if encoding fails
    return Math.ceil(text.length / 4);
  }
}

// 2) Extract JSON from the GPT response
function extractJson(rawText: string): string | null {
  // Clean up the response text to extract JSON
  rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Find JSON object within the text - using a compatible regex without the 's' flag
  const match = rawText.match(/(\{[\s\S]*\})/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

// 3) Role inference function (with optional userContext)
async function labelSpeakers(
  fileName: string, 
  originalTranscript: any[], 
  userContext?: string
): Promise<string> {
  try {
    // Summarize transcript so GPT sees essential text
    const simplifiedSegments = originalTranscript.map(seg => ({
      speaker: seg.speaker,
      text: seg.text
    }));
    
    const segmentsStr = JSON.stringify(simplifiedSegments, null, 2);

    // Add user instructions if provided
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
      temperature: 0.1
    });
    
    const rawText = response.choices[0].message.content?.trim() || '';
    const jsonStr = extractJson(rawText);
    
    if (!jsonStr) {
      console.error("No valid JSON found in the response for role labeling.");
      return "";
    }
    
    return jsonStr;
  } catch (error) {
    console.error(`Role inference failed for ${fileName}:`, error);
    return "";
  }
}

// 4) Name inference with role information (also optional userContext)
async function inferNamesInOnePass(
  fileName: string, 
  transcriptSegments: any[], 
  userContext?: string,
  intervieweeNames?: string[]
): Promise<string> {
  try {
    const lines = transcriptSegments.map((seg, i) => {
      const speaker = seg.speaker || "Unknown";
      const role = seg.role || "Unknown";
      const text = seg.text || "";
      return `Segment ${i}\n${speaker} (${role}): ${text}`;
    });
    
    const fullTranscriptStr = lines.join("\n\n");

    const contextBlock = userContext
      ? `Additional context about the speakers:\n${userContext}\n\n`
      : '';

    const namesHint = intervieweeNames && intervieweeNames.length > 0
      ? `The known interviewee(s) name(s) are: ${intervieweeNames.join(', ')}.`
      : "The interviewee(s) name(s) are unknown.";
    
    const prompt = `
      We have a full transcript of a video interview, including speaker labels, roles, and their text.

      ${contextBlock}

      Your task:
        - Determine the *real name* of each speaker if it can be inferred from context or user instructions.
        - If unknown, use "Unknown".

      ${namesHint}

      Return only valid JSON, like:
      {
        "SPEAKER_00": "Liz",
        "SPEAKER_01": "Unknown"
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
      temperature: 1
    });
    
    const rawText = response.choices[0].message.content?.trim() || '';
    const jsonStr = extractJson(rawText);
    
    if (!jsonStr) {
      console.error("No valid JSON found in name inference response.");
      return "";
    }
    
    return jsonStr;
  } catch (error) {
    console.error(`Name inference failed for ${fileName}:`, error);
    return "";
  }
}

// 5) Optional fallback for certain name patterns
function applyFallbackHeuristic(transcript: any[]): any[] {
  return transcript.map((seg, i) => {
    const updatedSeg = { ...seg };
    
    if (updatedSeg.role?.toLowerCase() === "interviewee") {
      if (updatedSeg.name === "Unknown" && i > 0) {
        const prevSeg = transcript[i - 1];
        const prevText = (prevSeg.text || "").toLowerCase();
        // Example fallback logic for the name "Liz"
        if (prevText.includes("liz")) {
          updatedSeg.name = "Liz";
          console.log(`Fallback triggered: Setting segment ${i} to name='Liz'.`);
        }
      }
    }
    
    return updatedSeg;
  });
}

// 6) Main process flow (role-based only)
async function processTranscript(
  fileName: string, 
  transcript: any[],
  userContext?: string,
  intervieweeNames?: string[]
): Promise<any[]> {
  try {
    // 1) Label speakers with roles
    const roleResult = await labelSpeakers(fileName, transcript, userContext);
    if (!roleResult) return transcript;
    
    const roleData = JSON.parse(roleResult);
    const speakerRoleMap = roleData[fileName] || {};
    
    // 2) Apply roles to transcript
    const transcriptWithRoles = transcript.map(seg => ({
      ...seg,
      role: speakerRoleMap[seg.speaker] || "Other"
    }));
    
    // 3) Infer names based on roles (and user context)
    const nameResult = await inferNamesInOnePass(
      fileName, 
      transcriptWithRoles,
      userContext,
      intervieweeNames
    );
    if (!nameResult) return transcriptWithRoles;
    
    const nameMap = JSON.parse(nameResult);
    
    // 4) Apply names to transcript
    const transcriptWithNames = transcriptWithRoles.map(seg => {
      const updatedSeg = { ...seg, name: "Unknown" };
      
      // If GPT found a name for this speaker
      if (nameMap[seg.speaker]) {
        updatedSeg.name = nameMap[seg.speaker];
      }
      
      // Optionally override the name if role is interviewer
      if ((seg.role || "").toLowerCase() === "interviewer") {
        updatedSeg.name = "Interviewer";
      }
      
      return updatedSeg;
    });
    
    // 5) Fallback heuristic
    return applyFallbackHeuristic(transcriptWithNames);
  } catch (error) {
    console.error("Error in role-based processing:", error);
    return transcript;
  }
}

// 7) The POST route
export async function POST(request: Request) {
  try {
    const {
      fileName,
      transcript,
      userContext,       // e.g. user-provided snippet describing each speaker
      intervieweeNames   // optional array of known interviewees
    } = await request.json();
    
    if (!fileName || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: "Invalid request data. Requires fileName and transcript array." },
        { status: 400 }
      );
    }
    
    console.log(`IdentifySpeakers agent: Processing transcript for ${fileName}`);
    
    // We only do role-based now
    const processedTranscript = await processTranscript(
      fileName, 
      transcript,
      userContext,
      intervieweeNames
    );
    
    return NextResponse.json({
      success: true,
      processedTranscript
    });
  } catch (error) {
    console.error("Error processing speaker identification:", error);
    return NextResponse.json(
      { error: "Failed to process speaker identification." },
      { status: 500 }
    );
  }
}
