import { NextResponse } from "next/server";
import { encode } from "gpt-3-encoder";
import { ChatCompletionMessageParam, OpenAI } from "openai";

interface SegmentWithSpeaker {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
  tokens?: number; // Optional token count
  [key: string]: any; // Allow for any additional properties
}

interface RequestData {
  file: string;
  transcript: SegmentWithSpeaker[];
  userContext?: string;
  speakers?: string[];
  chunkLimit?: number;
}

/**
 * Approximates the number of tokens in a string for OpenAI models.
 */
function approximateTokenCount(text: string): number {
  return encode(text).length;
}

/**
 * Builds a snippet from a segment, formatting it properly for the model.
 */
function buildSnippet(segment: SegmentWithSpeaker): string {
  const { speaker, text, start, end } = segment;
  const formattedTime = `[${formatTimestamp(start)} - ${formatTimestamp(end)}]`;
  return `${speaker}: ${text} ${formattedTime}`;
}

/**
 * Formats a timestamp (in seconds) to MM:SS format.
 */
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Chunks segments to fit within token limits while trying to keep coherent parts together.
 */
function chunkSegments(
  segments: SegmentWithSpeaker[],
  maxChunkTokens = 12000
): SegmentWithSpeaker[][] {
  if (!segments || segments.length === 0) return [];

  const chunks: SegmentWithSpeaker[][] = [];
  let currentChunk: SegmentWithSpeaker[] = [];
  let currentTokenCount = 0;

  // Add tokens count if not already present
  const segmentsWithTokens = segments.map((seg) => {
    if (seg.tokens === undefined) {
      const snippet = buildSnippet(seg);
      return { ...seg, tokens: approximateTokenCount(snippet) };
    }
    return seg;
  });

  for (const segment of segmentsWithTokens) {
    // Skip empty segments
    if (!segment.text.trim()) continue;

    const segmentTokens = segment.tokens || 0;

    // If adding this segment would exceed the limit, start a new chunk
    // But first, ensure we're not dealing with a segment that's too large by itself
    if (
      segmentTokens > maxChunkTokens &&
      currentChunk.length === 0 &&
      chunks.length === 0
    ) {
      // This is a single segment that's too large - truncate it
      const truncatedText = segment.text.substring(0, 1000) + "..."; // Simple truncation
      const truncatedSegment = {
        ...segment,
        text: truncatedText,
        tokens: approximateTokenCount(
          buildSnippet({ ...segment, text: truncatedText })
        ),
      };
      chunks.push([truncatedSegment]);
      continue;
    }

    if (currentTokenCount + segmentTokens > maxChunkTokens && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokenCount = 0;
    }

    currentChunk.push(segment);
    currentTokenCount += segmentTokens;
  }

  // Add the last chunk if it's not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Recursively extracts content from chunked segments based on supplied requirements.
 */
async function processAllChunksForStoryline(
  chunks: SegmentWithSpeaker[][],
  userContext: string = "",
  speakers: string[] = [],
  file: string = "Transcript"
): Promise<any> {
  try {
    // Filter segments by speakers if specified
    const filteredChunks = speakers.length > 0 
      ? chunks.map(chunk => filterSegmentsBySpeakers(chunk, speakers))
      : chunks;
    
    // Remove empty chunks after filtering
    const nonEmptyChunks = filteredChunks.filter(chunk => chunk.length > 0);
    
    if (nonEmptyChunks.length === 0) {
      return {
        success: false,
        error: "No relevant content found for the specified speakers"
      };
    }

    // Process each chunk to get key content
    const chunksContent: string[] = nonEmptyChunks.map(chunk => {
      return chunk.map(segment => buildSnippet(segment)).join("\n");
    });

    // Generate storyline options from all the content
    const storylineResult = await generateStorylineOptions(
      chunksContent,
      userContext,
      file,
      speakers
    );

    return storylineResult;
  } catch (error) {
    console.error("Error processing chunks for storyline:", error);
    return {
      success: false,
      error: `Failed to process transcript chunks: ${error}`
    };
  }
}

/**
 * Filters segments to include only those from the specified speakers.
 */
function filterSegmentsBySpeakers(
  segments: SegmentWithSpeaker[],
  speakerList: string[]
): SegmentWithSpeaker[] {
  if (!segments || segments.length === 0 || speakerList.length === 0) {
    return segments;
  }

  const normalizedSpeakers = speakerList.map(s => s.toLowerCase().trim());
  
  return segments.filter(segment => 
    normalizedSpeakers.some(speaker => 
      segment.speaker?.toLowerCase().includes(speaker)
    )
  );
}

/**
 * Core function to generate storyline options based on transcript content.
 */
async function generateStorylineOptions(
  contentChunks: string[],
  userContext: string = "",
  filename: string = "Transcript",
  speakers: string[] = []
): Promise<any> {
  try {
    if (!contentChunks || contentChunks.length === 0) {
      return {
        success: false,
        error: "Empty or invalid transcript content"
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY as string,
    });

    // Construct the system prompt based on user's inputs
    let speakerContext = "";
    if (speakers && speakers.length > 0) {
      speakerContext = `Focus your analysis on content from these speakers: ${speakers.join(", ")}.`;
    }

    const userContextPrompt = userContext ? 
      `The user provided this additional context about their goals: "${userContext}"` : 
      "The user did not provide any specific context about their goals.";

    // Build the messages array
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a narrative structure expert who helps extract storylines from transcripts. 
Your task is to analyze the transcript and suggest three distinctly different approaches for structuring a narrative based on the content.
${speakerContext}
${userContextPrompt}

For each narrative approach, provide:
1. A compelling title
2. A brief description of the narrative approach (how the story would be structured)
3. 3-5 key moments or quotes that would form the backbone of this narrative structure
4. 2-4 suggested themes that this narrative approach highlights

Format your output as JSON with the following structure:
{
  "narrative_options": [
    {
      "title": "Title for Approach 1",
      "approach_description": "Description of how this narrative would be structured",
      "key_moments": [
        {"speaker": "Speaker Name", "moment": "The quote or moment"},
        ...
      ],
      "suggested_themes": ["Theme 1", "Theme 2", ...]
    },
    ... (repeat for the other two approaches)
  ]
}

Be creative, insightful, and help the user see different ways they could shape this content into a compelling narrative.`
      }
    ];

    // Add content chunks as user messages
    for (const chunkContent of contentChunks) {
      messages.push({
        role: "user",
        content: `Here is part of the transcript:\n\n${chunkContent}`
      });
    }

    // Make completion request
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const responseContent = response.choices[0]?.message.content;
    if (!responseContent) {
      throw new Error("No content returned from OpenAI");
    }

    try {
      const parsedJson = JSON.parse(responseContent);
      return {
        success: true,
        storylineJson: {
          [filename]: parsedJson
        }
      };
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      return {
        success: false,
        error: "Failed to parse storyline results"
      };
    }
  } catch (error: any) {
    console.error("Error generating storyline options:", error);
    return {
      success: false,
      error: `Failed to generate storyline options: ${error.message || error}`
    };
  }
}

/**
 * POST handler for the storyline agent route.
 */
export async function POST(request: Request) {
  try {
    const data: RequestData = await request.json();
    const { file, transcript, userContext = "", speakers = [], chunkLimit = 100000 } = data;
    
    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing transcript" },
        { status: 400 }
      );
    }

    if (transcript.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transcript is empty" },
        { status: 400 }
      );
    }

    // Process transcript into chunks
    const chunks = chunkSegments(transcript, chunkLimit);
    
    // Process all chunks to generate storyline options
    const result = await processAllChunksForStoryline(chunks, userContext, speakers, file);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in storyline agent:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
} 