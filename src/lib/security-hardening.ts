// Advanced security hardening utilities

import { logger } from './logger';

// Content Security Policy helper
export const setupCSP = () => {
  if (typeof document === 'undefined') return;

  const nonce = generateSecureNonce();
  
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];

  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = cspDirectives.join('; ');
  document.head.appendChild(meta);

  return nonce;
};

// Secure nonce generation
export const generateSecureNonce = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)));
  }
  
  // Fallback for older browsers
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Input sanitization
export const sanitizeHtml = (input: string): string => {
  const element = document.createElement('div');
  element.textContent = input;
  return element.innerHTML;
};

// XSS protection
export const detectXSS = (input: string): boolean => {
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[\s\S]*?onerror[\s\S]*?>/gi,
    /<svg[\s\S]*?onload[\s\S]*?>/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

// SQL injection detection
export const detectSQLInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/gi,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
    /(UNION\s+(ALL\s+)?SELECT)/gi,
    /(\b(CONCAT|CHAR|ASCII)\s*\()/gi,
    /(--|\/\*|\*\/|;)/g
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

// Rate limiting client-side
class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, { max: number; window: number }> = new Map();

  setLimit(key: string, maxRequests: number, windowMs: number): void {
    this.limits.set(key, { max: maxRequests, window: windowMs });
  }

  canMakeRequest(key: string): boolean {
    const limit = this.limits.get(key);
    if (!limit) return true;

    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < limit.window);
    
    if (validRequests.length >= limit.max) {
      logger.warn('Rate limit exceeded', { key, requests: validRequests.length, limit: limit.max });
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

export const rateLimiter = new ClientRateLimiter();

// Setup default rate limits
rateLimiter.setLimit('auth', 5, 15 * 60 * 1000); // 5 auth attempts per 15 minutes
rateLimiter.setLimit('api', 100, 60 * 1000); // 100 API calls per minute
rateLimiter.setLimit('upload', 10, 5 * 60 * 1000); // 10 uploads per 5 minutes

// Session security
export const validateSession = (session: any): boolean => {
  if (!session || !session.access_token) {
    return false;
  }

  try {
    // Basic JWT validation (decode without verification for client-side checks)
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    // Check if token is expired
    if (payload.exp && payload.exp < now) {
      logger.warn('Session token expired');
      return false;
    }

    // Check if token is too old (even if not expired)
    if (payload.iat && (now - payload.iat) > 24 * 60 * 60) {
      logger.warn('Session token too old');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Session validation failed', error);
    return false;
  }
};

// Secure storage wrapper
export const secureStorage = {
  set: (key: string, value: any, encrypt = false): void => {
    try {
      let serialized = JSON.stringify(value);
      
      if (encrypt && typeof window !== 'undefined' && window.crypto) {
        // Simple encryption (for demo - use proper encryption in production)
        serialized = btoa(serialized);
      }
      
      localStorage.setItem(`secure_${key}`, serialized);
    } catch (error) {
      logger.error('Failed to store data securely', { key, error });
    }
  },

  get: <T>(key: string, encrypted = false): T | null => {
    try {
      const stored = localStorage.getItem(`secure_${key}`);
      if (!stored) return null;

      let data = stored;
      if (encrypted) {
        data = atob(stored);
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to retrieve secure data', { key, error });
      return null;
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(`secure_${key}`);
  },

  clear: (): void => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('secure_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Fingerprinting prevention
export const preventFingerprinting = (): void => {
  if (typeof window === 'undefined') return;

  // Disable certain APIs that can be used for fingerprinting
  try {
    // Canvas fingerprinting protection
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function() {
      // Add small random noise to prevent canvas fingerprinting
      const context = this.getContext('2d');
      if (context) {
        context.fillStyle = `rgba(${Math.random() * 10}, ${Math.random() * 10}, ${Math.random() * 10}, 0.01)`;
        context.fillRect(0, 0, 1, 1);
      }
      return originalToDataURL.apply(this, arguments as any);
    };

    // WebGL fingerprinting protection
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // Return generic values for fingerprinting parameters
      if (parameter === 37445) return 'Generic Renderer';
      if (parameter === 37446) return 'Generic Vendor';
      return getParameter.apply(this, arguments as any);
    };
  } catch (error) {
    // Silently fail if APIs are not available
  }
};

// Initialize security measures
export const initializeSecurity = (): void => {
  if (typeof window === 'undefined') return;

  setupCSP();
  preventFingerprinting();
  
  // Set up security event listeners
  window.addEventListener('beforeunload', () => {
    // Clear sensitive data before page unload
    secureStorage.clear();
  });

  // Detect developer tools
  let devtools = { open: false, orientation: null };
  setInterval(() => {
    if (window.outerHeight - window.innerHeight > 200 || 
        window.outerWidth - window.innerWidth > 200) {
      if (!devtools.open) {
        devtools.open = true;
        logger.warn('Developer tools detected as opened');
      }
    } else {
      devtools.open = false;
    }
  }, 500);

  logger.info('Security measures initialized');
};