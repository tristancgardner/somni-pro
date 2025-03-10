import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { rateLimit } from '@/lib/rate-limit';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple in-memory queue implementation
// In production, consider using Redis or another external queue
const processingQueue = new Map();

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id || session.user.email;
    
    // 2. Apply rate limiting (5 requests per minute per user)
    const limiter = await rateLimit(userId);
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    // 3. Parse the request body
    const body = await req.json();
    const { transcript, mode, numSpeakers = null, generateLabels = false } = body;
    
    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Invalid transcript data. Expected array of segments.' },
        { status: 400 }
      );
    }
    
    // 4. Check if this user already has a job in the queue
    if (processingQueue.has(userId)) {
      return NextResponse.json(
        { error: 'You already have a speaker identification job in progress.', jobId: processingQueue.get(userId) },
        { status: 409 }
      );
    }
    
    // 5. Generate a job ID and add to queue
    const jobId = Date.now().toString();
    processingQueue.set(userId, jobId);
    
    // 6. Process the transcript
    try {
      const result = await processTranscript(transcript, mode, numSpeakers, generateLabels);
      
      // Record usage for billing/analytics (implement this based on your needs)
      recordUsage(userId, 'identify-speakers', result.tokensUsed || 0);
      
      // 7. Remove from queue and return results
      processingQueue.delete(userId);
      return NextResponse.json({ success: true, result });
    } catch (error) {
      console.error('Speaker identification error:', error);
      processingQueue.delete(userId);
      return NextResponse.json(
        { error: 'Error processing transcript' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Speaker identification request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processTranscript(transcript, mode = 'context_based', numSpeakers = null, generateLabels = false) {
  // Step 1: Prepare the transcript data for processing
  const simplifiedSegments = transcript.map(seg => ({
    speaker: seg.speaker,
    text: seg.text
  }));
  
  // Step 2: Build the appropriate prompt based on mode
  let prompt;
  
  if (mode === 'role_based') {
    prompt = buildRoleBasedPrompt(simplifiedSegments, numSpeakers);
  } else {
    prompt = buildContextBasedPrompt(simplifiedSegments, numSpeakers);
  }
  
  // Step 3: Call OpenAI API
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  
  // Step 4: Extract and parse the JSON from the response
  const rawText = response.choices[0].message.content.trim();
  const jsonStr = extractJSON(rawText);
  
  if (!jsonStr) {
    throw new Error('Failed to extract valid JSON from the API response');
  }
  
  const speakerMap = JSON.parse(jsonStr);
  
  // Step 5: Apply the speaker identifications to the original transcript
  const updatedTranscript = transcript.map(seg => {
    const updatedSeg = { ...seg };
    const speaker = seg.speaker;
    
    if (speakerMap[speaker]) {
      if (mode === 'role_based') {
        updatedSeg.role = speakerMap[speaker];
        
        // If we should generate name labels and it's not an interviewer
        if (generateLabels && speakerMap[speaker] !== 'Interviewer') {
          updatedSeg.name = speakerMap[speaker] === 'Interviewee' 
            ? 'Guest' 
            : `Person ${speaker.replace('SPEAKER_', '')}`;
        } else if (speakerMap[speaker] === 'Interviewer') {
          updatedSeg.name = 'Interviewer';
        }
      } else {
        // For context-based, the values are directly names
        updatedSeg.name = speakerMap[speaker];
      }
    }
    
    return updatedSeg;
  });
  
  return {
    updatedTranscript,
    speakerMap,
    tokensUsed: calculateTokenUsage(prompt, rawText)
  };
}

function buildRoleBasedPrompt(segments, numSpeakers) {
  const segmentsStr = JSON.stringify(segments, null, 2);
  
  let speakerConstraint = '';
  if (numSpeakers && numSpeakers > 0) {
    speakerConstraint = `There are exactly ${numSpeakers} speakers in this transcript.`;
  }
  
  return `
    You are analyzing a transcript with multiple speakers (SPEAKER_00, SPEAKER_01, etc.).
    ${speakerConstraint}
    Your task: assign exactly one of these roles to each speaker:
    - "Interviewee",
    - "Interviewer",
    - "Other".

    Below is the transcript. Return only valid JSON with no extra text:
    ${segmentsStr}

    Return it in this format:
    {
      "SPEAKER_00": "Interviewee",
      "SPEAKER_01": "Interviewer",
      "SPEAKER_02": "Other"
    }
  `.trim();
}

function buildContextBasedPrompt(segments, numSpeakers) {
  const lines = segments.map((seg, i) => 
    `Segment ${i}\n${seg.speaker}: ${seg.text}`
  );
  
  const transcriptStr = lines.join('\n\n');
  
  let speakerConstraint = '';
  if (numSpeakers && numSpeakers > 0) {
    speakerConstraint = `There are exactly ${numSpeakers} different speakers in this conversation.`;
  }
  
  return `
    We have a transcript of a conversation in chronological order among multiple speakers.
    ${speakerConstraint}
    Infer names based on context. For example, if someone addresses "Liz, ...", another segment with a speaker change might be Liz.
    Leave as "Unknown" if no name can be inferred.

    Return valid JSON, like:
    {
      "SPEAKER_00": "Liz",
      "SPEAKER_01": "Unknown"
    }

    Transcript:
    ---START---
    ${transcriptStr}
    ---END---
  `.trim();
}

function extractJSON(rawText) {
  // Remove markdown code block syntax
  const cleaned = rawText.replace(/```(?:json)?|```/g, '').trim();
  
  // Try to find JSON object pattern
  const match = cleaned.match(/(\{[\s\S]*\})/);
  return match ? match[1].trim() : null;
}

function calculateTokenUsage(prompt, response) {
  // Approximate token calculation - 4 chars ~= 1 token for English text
  return Math.ceil((prompt.length + response.length) / 4);
}

// Simple usage tracking function - implement based on your needs
function recordUsage(userId, feature, tokens) {
  // In a real implementation, you would:
  // 1. Store this information in your database
  // 2. Update user's quota/limits
  // 3. Generate billing information if needed
  console.log(`Usage recorded - User: ${userId}, Feature: ${feature}, Tokens: ${tokens}`);
} 