// Enhanced error handling for security and productivity

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    isOperational = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error classes for common scenarios
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', context?: Record<string, any>) {
    super(message, 'AUTH_ERROR', 401, true, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', context?: Record<string, any>) {
    super(message, 'NOT_FOUND', 404, true, context);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, 'RATE_LIMIT', 429, true, context);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', context?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, true, context);
    this.name = 'DatabaseError';
  }
}

// Error sanitization for security (removes sensitive information)
export const sanitizeError = (error: any): { message: string; code?: string; statusCode?: number } => {
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    };
  }

  // Supabase errors
  if (error?.code) {
    const supabaseErrorMap: Record<string, string> = {
      'PGRST116': 'Resource not found',
      '23505': 'Resource already exists',
      '23503': 'Referenced resource not found',
      '23502': 'Required field missing',
      '42P01': 'Invalid request',
      '42601': 'Invalid request format'
    };

    return {
      message: supabaseErrorMap[error.code] || 'Database operation failed',
      code: 'DATABASE_ERROR',
      statusCode: 400
    };
  }

  // Network errors
  if (error?.message?.includes('fetch')) {
    return {
      message: 'Network connection failed',
      code: 'NETWORK_ERROR',
      statusCode: 503
    };
  }

  // Generic error fallback
  return {
    message: isDevelopment ? error?.message || 'Unknown error' : 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  };
};

// Error logger for monitoring and debugging
export const logError = (error: any, context?: Record<string, any>) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      code: error?.code
    },
    context,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined
  };

  console.error('Application Error:', errorInfo);

  // In production, you would send this to your logging service
  // Example: sendToLoggingService(errorInfo);
};

// Error boundary helper
export const handleAsyncError = async <T>(
  asyncFn: () => Promise<T>,
  errorContext?: string
): Promise<{ data: T | null; error: string | null }> => {
  try {
    const data = await asyncFn();
    return { data, error: null };
  } catch (error) {
    logError(error, { context: errorContext });
    const sanitized = sanitizeError(error);
    return { data: null, error: sanitized.message };
  }
};

// Retry mechanism with exponential backoff
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};