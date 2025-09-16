import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Security-focused input validation
export class InputValidator {
  // Sanitize HTML input
  static sanitizeHtml(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: protocols
      .trim()
      .slice(0, 10000); // Limit length
  }

  // Detect SQL injection patterns
  static detectSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      /(\b(or|and)\s+\d+\s*=\s*\d+)/i,
      /(--|\/\*|\*\/)/,
      /(\b(char|ascii|substring|length|user|database|version)\s*\()/i,
      /(\b(waitfor|delay)\s+)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // Detect XSS patterns
  static detectXss(input: string): boolean {
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[\s\S]*?onerror[\s\S]*?>/gi,
      /<svg[\s\S]*?onload[\s\S]*?>/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }

  // Validate file upload
  static validateFile(file: { name: string; size: number; type: string }): { valid: boolean; error?: string } {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/json',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedExtensions = /\.(pdf|doc|docx|txt|csv|json|jpg|jpeg|png|gif|webp)$/i;

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size too large (max 10MB)' };
    }

    if (!allowedExtensions.test(file.name)) {
      return { valid: false, error: 'File extension not allowed' };
    }

    // Check for suspicious file names
    if (/[<>:"|?*]/.test(file.name) || file.name.includes('..')) {
      return { valid: false, error: 'Invalid file name' };
    }

    return { valid: true };
  }

  // Comprehensive input validation
  static validateInput(input: any, schema: z.ZodSchema): { valid: boolean; data?: any; errors?: string[] } {
    try {
      // First, check for malicious patterns if it's a string
      if (typeof input === 'string') {
        if (this.detectSqlInjection(input)) {
          return { valid: false, errors: ['Potential SQL injection detected'] };
        }
        
        if (this.detectXss(input)) {
          return { valid: false, errors: ['Potential XSS detected'] };
        }
      }

      // Then validate with Zod schema
      const result = schema.parse(input);
      return { valid: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          valid: false, 
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`) 
        };
      }
      return { valid: false, errors: ['Validation failed'] };
    }
  }

  // Validate and sanitize object recursively
  static sanitizeObject(obj: any, maxDepth: number = 5): any {
    if (maxDepth <= 0) return null;
    
    if (typeof obj === 'string') {
      return this.sanitizeHtml(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.slice(0, 100).map(item => this.sanitizeObject(item, maxDepth - 1));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      let count = 0;
      
      for (const [key, value] of Object.entries(obj)) {
        if (count >= 50) break; // Limit object size
        
        const sanitizedKey = this.sanitizeHtml(key);
        if (sanitizedKey.length > 0 && sanitizedKey.length <= 100) {
          sanitized[sanitizedKey] = this.sanitizeObject(value, maxDepth - 1);
          count++;
        }
      }
      
      return sanitized;
    }
    
    return obj;
  }
}

// Common validation schemas
export const securitySchemas = {
  email: z.string().email().min(5).max(320),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  
  uuid: z.string().uuid(),
  
  credits: z.number().int().min(0).max(1000000),
  
  userRole: z.enum(['super_admin', 'agency_admin', 'admin', 'collaborator', 'content_writer', 'user']),
  
  filename: z.string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename characters'),
  
  textContent: z.string()
    .min(1)
    .max(50000)
    .refine(val => !InputValidator.detectSqlInjection(val), 'Invalid content detected')
    .refine(val => !InputValidator.detectXss(val), 'Invalid content detected'),
    
  adminAction: z.object({
    action: z.enum(['create', 'read', 'update', 'delete']),
    resource: z.enum(['user', 'credit', 'document', 'system', 'audit']),
    targetId: z.string().uuid().optional(),
    reason: z.string().min(1).max(500).optional()
  }),

  paymentData: z.object({
    sessionId: z.string().min(1).max(255),
    amount: z.number().positive().max(100000),
    currency: z.string().length(3).regex(/^[A-Z]{3}$/),
    email: z.string().email()
  })
};

// Validation middleware for edge functions
export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request): Promise<{ valid: boolean; data?: any; response?: Response }> => {
    try {
      const body = await req.json();
      const validation = InputValidator.validateInput(body, schema);
      
      if (!validation.valid) {
        return {
          valid: false,
          response: new Response(
            JSON.stringify({
              error: 'Validation failed',
              details: validation.errors
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
              }
            }
          )
        };
      }
      
      return { valid: true, data: validation.data };
    } catch (error) {
      return {
        valid: false,
        response: new Response(
          JSON.stringify({
            error: 'Invalid JSON body'
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
            }
          }
        )
      };
    }
  };
}