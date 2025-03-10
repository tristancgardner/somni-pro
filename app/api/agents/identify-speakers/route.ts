import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { encode } from 'gpt-tokenizer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper functions adapted from the Python code
function approximateTokenCount(text: string): number {
  try {
    return encode(text).length;
  } catch (error) {
    console.error('Error calculating token count:', error);
    // Fallback to rough estimation if encoding fails
    return Math.ceil(text.length / 4);
  }
}

function extractJson(rawText: string): string | null {
  // Clean up the response text to extract JSON
  rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Find JSON object within the text
  const match = rawText.match(/(\{.*\})/s);
  if (match) {
    return match[1].trim();
  }
  return null;
}

// Role inference function
async function labelSpeakers(fileName: string, originalTranscript: any[]): Promise<string> {
  try {
    const simplifiedSegments = originalTranscript.map(seg => ({
      speaker: seg.speaker,
      text: seg.text
    }));
    
    const segmentsStr = JSON.stringify(simplifiedSegments, null, 2);
    
    const prompt = `
      You are analyzing a JSON transcript of a video interview with multiple speakers (SPEAKER_00, SPEAKER_01, etc.).
      Your task: assign exactly one of these roles to each speaker:
      - "Interviewee",
      - "Interviewer",
      - "Other".

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
      console.error("No valid JSON found in the response.");
      return "";
    }
    
    return jsonStr;
  } catch (error) {
    console.error(`Role inference failed for ${fileName}:`, error);
    return "";
  }
}

// Name inference with role information
async function inferNamesInOnePass(fileName: string, transcriptSegments: any[], intervieweeNames?: string[]): Promise<string> {
  try {
    const lines = transcriptSegments.map((seg, i) => {
      const speaker = seg.speaker || "Unknown";
      const role = seg.role || "Unknown";
      const text = seg.text || "";
      return `Segment ${i}\n${speaker} (${role}): ${text}`;
    });
    
    const fullTranscriptStr = lines.join("\n\n");
    
    const namesHint = intervieweeNames && intervieweeNames.length > 0
      ? `The interviewee(s) name(s) are: ${intervieweeNames.join(', ')}.`
      : "The interviewee(s) name(s) are unknown.";
    
    const prompt = `
      We have a full transcript of a video interview, including speaker labels, roles, and their text.
      Your task:
      - Determine the *real name* of each speaker if it can be inferred from context.
      
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

// Name inference based on chronology
async function inferNamesByChronology(fileName: string, transcriptSegments: any[]): Promise<string> {
  try {
    const lines = transcriptSegments.map((seg, i) => {
      const speaker = seg.speaker || "Unknown";
      const text = seg.text || "";
      return `Segment ${i}\n${speaker}: ${text}`;
    });
    
    const fullTranscriptStr = lines.join("\n\n");
    
    const prompt = `
      We have a transcript of a conversation in chronological order among multiple speakers.
      Infer names based on context. For example, if someone addresses "Liz, ...", another segment with a speaker change might be Liz.
      Leave as "Unknown" if no name can be inferred.

      Return valid JSON, like:
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
    console.log(`[Name Inference by Chronology] tokens for ${fileName}: ${tokenCount}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });
    
    const rawText = response.choices[0].message.content?.trim() || '';
    const jsonStr = extractJson(rawText);
    
    if (!jsonStr) {
      console.error("No valid JSON found in the name inference response.");
      return "";
    }
    
    return jsonStr;
  } catch (error) {
    console.error(`Name inference failed for ${fileName}:`, error);
    return "";
  }
}

// Apply heuristic rules for fallback
function applyFallbackHeuristic(transcript: any[]): any[] {
  return transcript.map((seg, i) => {
    const updatedSeg = { ...seg };
    
    if (updatedSeg.role?.toLowerCase() === "interviewee") {
      if (updatedSeg.name === "Unknown" && i > 0) {
        const prevSeg = transcript[i - 1];
        const prevText = (prevSeg.text || "").toLowerCase();
        // This is a simplified example - you can extend with other patterns
        if (prevText.match(/\bliz['\.,\?!\s]|liz$/)) {
          updatedSeg.name = "Liz";
          console.log(`Fallback triggered: Setting segment ${i} to name='Liz'.`);
        }
      }
    }
    
    return updatedSeg;
  });
}

// Process transcript with role-based approach
async function processWithRoleBased(
  fileName: string, 
  transcript: any[], 
  intervieweeNames?: string[]
): Promise<any[]> {
  try {
    // Step 1: Label speakers with roles
    const roleResult = await labelSpeakers(fileName, transcript);
    if (!roleResult) return transcript;
    
    const roleData = JSON.parse(roleResult);
    const speakerRoleMap = roleData[fileName] || {};
    
    // Apply roles to transcript
    const transcriptWithRoles = transcript.map(seg => ({
      ...seg,
      role: speakerRoleMap[seg.speaker] || "Other"
    }));
    
    // Step 2: Infer names based on roles
    const nameResult = await inferNamesInOnePass(fileName, transcriptWithRoles, intervieweeNames);
    if (!nameResult) return transcriptWithRoles;
    
    const nameMap = JSON.parse(nameResult);
    
    // Apply names to transcript
    const transcriptWithNames = transcriptWithRoles.map(seg => {
      const updatedSeg = { ...seg, name: "Unknown" };
      
      // Use name mapping if available
      if (nameMap[seg.speaker]) {
        updatedSeg.name = nameMap[seg.speaker];
      }
      
      // Assign "Interviewer" as the name for any Interviewer role
      if (seg.role?.toLowerCase() === "interviewer") {
        updatedSeg.name = "Interviewer";
      }
      
      return updatedSeg;
    });
    
    // Apply fallback heuristic
    return applyFallbackHeuristic(transcriptWithNames);
  } catch (error) {
    console.error("Error in role-based processing:", error);
    return transcript;
  }
}

// Process transcript with context-based approach
async function processWithContextBased(fileName: string, transcript: any[]): Promise<any[]> {
  try {
    // Infer names based on chronology and context
    const nameResult = await inferNamesByChronology(fileName, transcript);
    if (!nameResult) return transcript;
    
    const nameMap = JSON.parse(nameResult);
    
    // Apply names to transcript
    return transcript.map(seg => ({
      ...seg,
      name: nameMap[seg.speaker] || "Unknown"
    }));
  } catch (error) {
    console.error("Error in context-based processing:", error);
    return transcript;
  }
}

export async function POST(request: Request) {
  try {
    const { fileName, transcript, mode, intervieweeNames } = await request.json();
    
    if (!fileName || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: "Invalid request data. Requires fileName and transcript array." },
        { status: 400 }
      );
    }
    
    console.log(`Processing transcript for ${fileName} with ${mode} mode`);
    
    let processedTranscript;
    
    if (mode === "role_based") {
      processedTranscript = await processWithRoleBased(fileName, transcript, intervieweeNames);
    } else if (mode === "context_based") {
      processedTranscript = await processWithContextBased(fileName, transcript);
    } else {
      return NextResponse.json(
        { error: "Invalid mode. Use 'role_based' or 'context_based'." },
        { status: 400 }
      );
    }
    
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