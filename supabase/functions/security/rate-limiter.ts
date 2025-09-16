// Rate limiting utility for edge functions
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class RateLimiter {
  private storage = new Map<string, { count: number; resetTime: number }>();

  constructor(private config: RateLimitConfig) {}

  async isAllowed(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const key = `rate_limit:${identifier}`;
    
    // Clean up expired entries
    this.cleanup(now);
    
    const record = this.storage.get(key);
    
    if (!record || now >= record.resetTime) {
      // Create new window
      const newResetTime = now + this.config.windowMs;
      this.storage.set(key, { count: 1, resetTime: newResetTime });
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newResetTime
      };
    }
    
    if (record.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      };
    }
    
    // Increment counter
    record.count++;
    this.storage.set(key, record);
    
    return {
      allowed: true,
      remaining: this.config.maxRequests - record.count,
      resetTime: record.resetTime
    };
  }

  private cleanup(now: number): void {
    for (const [key, record] of this.storage.entries()) {
      if (now >= record.resetTime) {
        this.storage.delete(key);
      }
    }
  }

  // Get rate limit headers for responses
  getRateLimitHeaders(remaining: number, resetTime: number): Record<string, string> {
    return {
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
      'X-RateLimit-Window': this.config.windowMs.toString()
    };
  }
}

// Pre-configured rate limiters for different operations
export const rateLimiters = {
  // General API requests
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }),
  
  // Authentication requests
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  }),
  
  // Payment requests
  payment: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10
  }),
  
  // Admin operations
  admin: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 50
  }),
  
  // File upload requests
  upload: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20
  })
};

// Helper function to get client identifier
export function getClientIdentifier(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  // Use the first available IP
  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';
  
  // For authenticated requests, also include user agent hash for additional uniqueness
  const userAgent = req.headers.get('user-agent') || '';
  const userAgentHash = userAgent ? btoa(userAgent).slice(0, 8) : '';
  
  return `${ip}:${userAgentHash}`;
}

// Rate limiting middleware
export async function applyRateLimit(
  req: Request,
  rateLimiter: RateLimiter,
  identifier?: string
): Promise<{ success: true } | { success: false; response: Response }> {
  const clientId = identifier || getClientIdentifier(req);
  const result = await rateLimiter.isAllowed(clientId);
  
  if (!result.allowed) {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      ...rateLimiter.getRateLimitHeaders(result.remaining, result.resetTime)
    };
    
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          resetTime: result.resetTime
        }),
        { status: 429, headers }
      )
    };
  }
  
  return { success: true };
}