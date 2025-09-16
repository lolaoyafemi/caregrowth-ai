import { z } from 'zod';
import { ClientRateLimiter } from './validation';

// Enhanced security utilities
export class SecurityManager {
  private rateLimiter = new ClientRateLimiter();
  private securityEvents: string[] = [];

  // Rate limiting for sensitive operations
  checkRateLimit(operation: string, maxAttempts: number = 5, windowMs: number = 300000): boolean {
    return this.rateLimiter.canAttempt(operation, maxAttempts, windowMs);
  }

  // Log security events
  logSecurityEvent(event: string, details?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const eventData = {
      timestamp,
      event,
      ...details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.securityEvents.push(JSON.stringify(eventData));
    
    // Keep only last 100 events
    if (this.securityEvents.length > 100) {
      this.securityEvents.shift();
    }
    
    console.warn('Security Event:', eventData);
  }

  // Validate session integrity
  validateSession(session: any): boolean {
    if (!session || !session.access_token) {
      this.logSecurityEvent('invalid_session', { reason: 'missing_token' });
      return false;
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      this.logSecurityEvent('session_expired', { expires_at: session.expires_at, now });
      return false;
    }

    return true;
  }

  // Sanitize user input for display
  sanitizeForDisplay(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .slice(0, 1000); // Limit length
  }

  // Check for suspicious patterns
  detectSuspiciousActivity(input: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /function\(/i,
      /alert\(/i,
      /document\./i,
      /window\./i,
      /\bselect\b.*\bfrom\b/i,
      /\bunion\b.*\bselect\b/i,
      /\bdrop\b.*\btable\b/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        this.logSecurityEvent('suspicious_input_detected', { 
          pattern: pattern.toString(), 
          input: input.slice(0, 100) 
        });
        return true;
      }
    }

    return false;
  }

  // Generate CSP nonce for inline scripts
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Get security headers for requests
  getSecurityHeaders(nonce?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };

    if (nonce) {
      headers['Content-Security-Policy'] = `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;`;
    }

    return headers;
  }

  // Clear security events (for privacy)
  clearSecurityEvents(): void {
    this.securityEvents = [];
  }

  // Get recent security events (for monitoring)
  getRecentSecurityEvents(): string[] {
    return [...this.securityEvents];
  }
}

// Validation schemas for security-critical operations
export const securitySchemas = {
  userRole: z.enum(['super_admin', 'agency_admin', 'admin', 'collaborator', 'content_writer', 'user']),
  
  creditOperation: z.object({
    userId: z.string().uuid(),
    amount: z.number().int().min(1).max(10000),
    operation: z.enum(['add', 'deduct', 'transfer']),
    reason: z.string().min(3).max(500).optional()
  }),

  adminAction: z.object({
    action: z.enum(['create', 'update', 'delete', 'view']),
    resource: z.enum(['user', 'credit', 'document', 'system']),
    targetId: z.string().uuid().optional(),
    metadata: z.record(z.any()).optional()
  }),

  fileUpload: z.object({
    filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/),
    size: z.number().min(1).max(10 * 1024 * 1024), // 10MB max
    type: z.string().regex(/^[a-zA-Z0-9\/+-]+$/)
  })
};

// Export singleton instance
export const securityManager = new SecurityManager();

// Security validation decorator
export function validateSecurity<T extends any[]>(
  schema: z.ZodSchema,
  operation: string
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: T) {
      // Rate limiting check
      if (!securityManager.checkRateLimit(operation)) {
        securityManager.logSecurityEvent('rate_limit_exceeded', { operation });
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Input validation
      try {
        schema.parse(args[0]);
      } catch (error) {
        securityManager.logSecurityEvent('validation_failed', { 
          operation, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        throw new Error('Invalid input provided');
      }

      // Suspicious activity check
      const input = JSON.stringify(args[0]);
      if (securityManager.detectSuspiciousActivity(input)) {
        throw new Error('Suspicious activity detected');
      }

      return method.apply(this, args);
    };
  };
}

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters long');

  if (password.length >= 12) score += 1;
  else feedback.push('Password should be at least 12 characters long for better security');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Password should contain lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Password should contain uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Password should contain numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Password should contain special characters');

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeating characters');
  }

  if (/123|abc|qwe|password|admin|login/i.test(password)) {
    score -= 2;
    feedback.push('Avoid common words and patterns');
  }

  return {
    score: Math.max(0, score),
    feedback,
    isStrong: score >= 4
  };
}

// Secure random string generator
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}
