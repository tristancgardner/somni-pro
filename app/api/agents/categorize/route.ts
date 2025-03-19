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
 * Categorize a single chunk of transcript by topics
 */
async function categorizeChunk(
  fileName: string,
  chunkText: string,
  userTopics: string[] | null,
  isAutoDetect: boolean
) {
  const systemPrompt = `
You are an AI assistant that analyzes conversation transcripts and categorizes them by topics.
You identify relevant segments that match specific topics or themes.
Return valid JSON only with no extra text or markdown.
  `.trim();

  let userPrompt;
  
  if (isAutoDetect) {
    // Auto-detect topics mode
    userPrompt = `
Analyze this transcript segment and identify the main topics being discussed:

${chunkText}

First, identify 3-7 main topics from this transcript.
Then, categorize segments of the conversation that match each topic.
Include the speaker's name and a brief summary of what was said about each topic.

Return JSON in this format:

{
  "detected_topics": ["topic1", "topic2", "topic3"],
  "categorized_segments": {
    "topic1": [
      {"speaker": "Speaker Name", "summary": "Brief summary of what was said about topic1"},
      {"speaker": "Another Speaker", "summary": "Another relevant point about topic1"}
    ],
    "topic2": [
      {"speaker": "Speaker Name", "summary": "Brief summary of what was said about topic2"}
    ]
  }
}
    `.trim();
  } else {
    // Use provided topics
    const topicsList = userTopics?.join('", "') || '';
    
    userPrompt = `
Analyze this transcript segment and categorize content according to these specific topics:
["${topicsList}"]

${chunkText}

For each topic, identify relevant segments of the conversation that discuss that topic.
Include the speaker's name and a brief summary of what was said about each topic.
If a topic isn't discussed at all, include it with an empty array.

Return JSON in this format:

{
  "categorized_segments": {
    "${userTopics?.[0] || 'topic1'}": [
      {"speaker": "Speaker Name", "summary": "Brief summary of what was said about this topic"},
      {"speaker": "Another Speaker", "summary": "Another relevant point about this topic"}
    ],
    "${userTopics?.[1] || 'topic2'}": [
      {"speaker": "Speaker Name", "summary": "Brief summary of what was said about this topic"}
    ]
  }
}
    `.trim();
  }

  const response = await openai.responses.create({
    model: "o3-mini-2025-01-31",
    instructions: systemPrompt,
    input: userPrompt,
    reasoning: { effort: "medium" },
  });

  // Extract the content
  const rawText = extractContentRecursively(response.output);
  const jsonStr = extractJson(rawText);
  if (!jsonStr) {
    throw new Error("No valid JSON returned for categorization.");
  }
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed parsing categorization JSON:", err);
    throw new Error("Invalid JSON from categorization process.");
  }
}

/**
 * Categorize all chunks of transcript and merge the results
 */
async function categorizeAllChunks(
  fileName: string,
  segments: any[],
  userTopics: string[] | null,
  isAutoDetect: boolean,
  chunkTokenLimit: number
) {
  const chunks = chunkSegments(segments, chunkTokenLimit);
  if (chunks.length === 0) {
    return {
      [fileName]: {
        detected_topics: [],
        categorized_segments: {}
      },
    };
  }

  let chunkResults = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Categorizing chunk ${i + 1}/${chunks.length}`);
    const result = await categorizeChunk(fileName, chunks[i], userTopics, isAutoDetect);
    chunkResults.push(result);
  }

  // Merge results from all chunks
  if (chunkResults.length > 1) {
    // Create a merged result structure
    let mergedResult: any = {
      detected_topics: [],
      categorized_segments: {}
    };

    // For auto-detect mode, collect all detected topics across chunks
    if (isAutoDetect) {
      const allTopics = new Set<string>();
      chunkResults.forEach(result => {
        if (result.detected_topics && Array.isArray(result.detected_topics)) {
          result.detected_topics.forEach((topic: string) => allTopics.add(topic));
        }
      });
      mergedResult.detected_topics = Array.from(allTopics);
    }

    // Merge categorized segments for each topic
    chunkResults.forEach(result => {
      if (result.categorized_segments) {
        Object.entries(result.categorized_segments).forEach(([topic, segments]) => {
          if (!mergedResult.categorized_segments[topic]) {
            mergedResult.categorized_segments[topic] = [];
          }
          if (Array.isArray(segments)) {
            mergedResult.categorized_segments[topic].push(...segments);
          }
        });
      }
    });

    return {
      [fileName]: mergedResult
    };
  } else {
    // Just return the single chunk result
    return {
      [fileName]: chunkResults[0]
    };
  }
}

// ------------------ Route Handler ------------------
export async function POST(req: Request) {
  try {
    const { file, transcript, topics, isAutoDetect, chunkLimit } = await req.json();

    const fileName = file || "Untitled";
    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: "Invalid request data. 'transcript' must be an array." },
        { status: 400 }
      );
    }

    // Validate topics if not in auto-detect mode
    if (!isAutoDetect && (!topics || !Array.isArray(topics) || topics.length === 0)) {
      return NextResponse.json(
        { error: "Topics must be provided when not using auto-detect mode." },
        { status: 400 }
      );
    }

    const tokenLimit = typeof chunkLimit === "number" ? chunkLimit : CHUNK_TOKEN_LIMIT;

    const result = await categorizeAllChunks(
      fileName, 
      transcript, 
      isAutoDetect ? null : topics, 
      isAutoDetect, 
      tokenLimit
    );

    return NextResponse.json({ success: true, categorizedJson: result }, { status: 200 });
  } catch (err: any) {
    console.error("Categorization route error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
} 