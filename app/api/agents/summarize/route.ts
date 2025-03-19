import { NextResponse } from "next/server";
import OpenAI from "openai";
import { encode } from "gpt-tokenizer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -----------------------------------
// Configurable token chunk limit (default: 200,000 tokens)
const CHUNK_TOKEN_LIMIT = 200_000;

/** 
 * Approximates token count using gpt-tokenizer,
 * with a fallback if necessary.
 */
function approximateTokenCount(text: string): number {
  try {
    return encode(text).length;
  } catch (error) {
    console.error("Error calculating token count:", error);
    return Math.ceil(text.length / 4);
  }
}

/**
 * Build a snippet from a transcript segment using its name, role, and text.
 */
function buildSegmentSnippet(seg: any): string {
  const segName = seg.name || "Unknown";
  const segRole = seg.role || "Other";
  const segText = seg.text || "";
  return `[${segName}] (${segRole}): ${segText}\n`;
}

/**
 * Chunk segments so that each chunk's token count does not exceed tokenLimit.
 */
function chunkSegments(segments: any[], tokenLimit: number): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  let currentChunkTokens = 0;

  for (const seg of segments) {
    const snippet = buildSegmentSnippet(seg);
    const snippetTokens = approximateTokenCount(snippet);

    if (currentChunkTokens + snippetTokens > tokenLimit) {
      chunks.push(currentChunk.trim());
      currentChunk = snippet;
      currentChunkTokens = snippetTokens;
    } else {
      currentChunk += snippet;
      currentChunkTokens += snippetTokens;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

/**
 * Recursively extract text content from a nested object.
 */
function extractContentRecursively(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) {
    return node.map(extractContentRecursively).join("");
  }
  if (typeof node === "object") {
    if (typeof node.content === "string") {
      return node.content;
    }
    let combined = "";
    for (const key in node) {
      combined += extractContentRecursively(node[key]);
    }
    return combined;
  }
  return "";
}

/**
 * Extract JSON substring from a raw text.
 */
function extractJson(rawText: string): string | null {
  const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const startIndex = cleaned.indexOf("{");
  const endIndex = cleaned.lastIndexOf("}");
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return cleaned.substring(startIndex, endIndex + 1).trim();
  }
  return null;
}

/**
 * Summarize a single chunk using GPT.
 */
async function summarizeChunk(
  fileName: string,
  chunkText: string,
  userContext: string
) {
  const systemPrompt = `
You are an AI assistant summarizing a portion of a conversation.
Highlight key moments and notable speakers as needed.
Return valid JSON only with no extra text or markdown.
  `.trim();

  const contextSection = userContext.trim()
    ? `User context: ${userContext}\n\n`
    : "";

  const userPrompt = `
${contextSection}
Transcript chunk:
${chunkText}

Please produce a concise summary of the conversation, highlighting key moments or speakers.
Return JSON in this format:

{
  "chunk_summary": "<short summary of this chunk>",
  "key_moments": ["moment1", "moment2"]
}
  `.trim();

  const response = await openai.responses.create({
    model: "o3-mini-2025-01-31",
    instructions: systemPrompt,
    input: userPrompt,
    reasoning: { effort: "medium" },
  });

  // Use extractContentRecursively instead of JSON.stringify
  const rawText = extractContentRecursively(response.output);
  const jsonStr = extractJson(rawText);
  if (!jsonStr) {
    throw new Error("No valid JSON returned for chunk summary.");
  }
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed parsing chunk JSON:", err);
    throw new Error("Invalid JSON from chunk summarization.");
  }
}

/**
 * Summarizes all chunks and, if necessary, merges them into a final summary.
 */
async function summarizeAllChunks(
  fileName: string,
  segments: any[],
  userContext: string,
  chunkTokenLimit: number
) {
  const chunks = chunkSegments(segments, chunkTokenLimit);
  if (chunks.length === 0) {
    return {
      [fileName]: {
        summary: "No valuable content",
        key_moments: [],
      },
    };
  }

  let chunkSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Summarizing chunk ${i + 1}/${chunks.length}`);
    const summary = await summarizeChunk(fileName, chunks[i], userContext);
    chunkSummaries.push(summary);
  }

  if (chunkSummaries.length > 1) {
    const combined = chunkSummaries
      .map((s, idx) => `Chunk ${idx + 1}: ${s.chunk_summary}`)
      .join("\n\n");

    const finalSystemPrompt = `
You are an assistant that merges partial summaries into one final cohesive summary.
Return valid JSON only.
    `.trim();

    const finalUserPrompt = `
We have the following partial summaries:
${combined}

Now produce a single final summary and a combined key_moments array.
Return JSON in this format:

{
  "${fileName}": {
    "summary": "<merged summary>",
    "key_moments": ["moment1", "moment2"]
  }
}
    `.trim();

    const finalResponse = await openai.responses.create({
      model: "o3-mini-2025-01-31",
      instructions: finalSystemPrompt,
      input: finalUserPrompt,
      reasoning: { effort: "medium" },
    });

    const finalRawText = extractContentRecursively(finalResponse.output);
    const finalJsonStr = extractJson(finalRawText);
    if (!finalJsonStr) {
      throw new Error("No valid JSON in final merged summary.");
    }
    return JSON.parse(finalJsonStr);
  } else {
    return {
      [fileName]: {
        summary: chunkSummaries[0].chunk_summary || "No summary",
        key_moments: chunkSummaries[0].key_moments || [],
      },
    };
  }
}

// ------------------ Route Handler ------------------
export async function POST(req: Request) {
  try {
    const { file, transcript, userContext, chunkLimit } = await req.json();

    const fileName = file || "Untitled";
    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: "Invalid request data. 'transcript' must be an array." },
        { status: 400 }
      );
    }

    const tokenLimit = typeof chunkLimit === "number" ? chunkLimit : CHUNK_TOKEN_LIMIT;

    const result = await summarizeAllChunks(fileName, transcript, userContext || "", tokenLimit);

    return NextResponse.json({ success: true, summaryJson: result }, { status: 200 });
  } catch (err: any) {
    console.error("Summarization route error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
