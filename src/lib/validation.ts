import { z } from 'zod';

// Common validation schemas for enhanced security
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(320, 'Email too long'); // RFC 5321 limit

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters');

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const creditsSchema = z.number()
  .int('Credits must be a whole number')
  .min(0, 'Credits cannot be negative')
  .max(9000, 'Credits amount too large');

// Input sanitization utilities
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML/XML tags
    .slice(0, 1000); // Limit length
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim().slice(0, 320);
};

// Validation helper for forms
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation failed' };
    }
    return { success: false, error: 'Invalid input format' };
  }
};

// Rate limiting helper (client-side basic implementation)
export class ClientRateLimiter {
  private attempts: Map<string, number[]> = new Map();

  canAttempt(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Clean old attempts
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Security headers for edge functions
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};