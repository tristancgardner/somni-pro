// Simple in-memory rate limiter
// For production, consider using Redis or another external store
const rateLimitStore = new Map();

interface RateLimitResponse {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  identifier: string,
  limit = 5,  // 5 requests
  window = 60 * 1000  // per minute (in ms)
): Promise<RateLimitResponse> {
  // Get current time
  const now = Date.now();
  
  // Initialize or get rate limit data for this identifier
  const data = rateLimitStore.get(identifier) || {
    tokens: [],
    reset: now + window
  };
  
  // Reset tokens if the window has passed
  if (now > data.reset) {
    data.tokens = [];
    data.reset = now + window;
  }
  
  // Filter out expired tokens
  data.tokens = data.tokens.filter(timestamp => now - timestamp < window);
  
  // Check if limit is reached
  const remaining = Math.max(0, limit - data.tokens.length);
  const success = data.tokens.length < limit;
  
  // Add the current request timestamp if under the limit
  if (success) {
    data.tokens.push(now);
  }
  
  // Update the store
  rateLimitStore.set(identifier, data);
  
  return {
    success,
    limit,
    remaining,
    reset: data.reset
  };
} 