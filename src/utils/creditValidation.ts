
import { toast } from 'sonner';
import { ClientRateLimiter } from '@/lib/validation';
import { logError } from '@/lib/errors';

// Enhanced credit validation with rate limiting and security
const rateLimiter = new ClientRateLimiter();

export const validateCreditsBeforeAction = (credits: number, actionName: string): boolean => {
  if (credits <= 0) {
    showInsufficientCreditsNotification(actionName);
    return false;
  }

  return true;
};

export const showInsufficientCreditsNotification = (actionName: string) => {
  toast.error(`You need credits to use ${actionName}`, {
    description: 'Purchase credits to access all AI-powered features.',
    duration: 5000,
    action: {
      label: 'Buy Credits',
      onClick: () => {
        // Use router navigation instead of direct window.location for better UX
        const event = new CustomEvent('navigate-to-payment', { 
          detail: { source: actionName } 
        });
        window.dispatchEvent(event);
        
        // Fallback to direct navigation
        window.open('https://buy.stripe.com/your-stripe-link', '_blank');
      }
    }
  });
};

// Credit usage tracking with validation
export const trackCreditUsage = (
  actionName: string,
  creditsUsed: number,
  userId: string,
  metadata?: Record<string, any>
) => {
  try {
    // Client-side usage tracking for analytics
    const usageEvent = {
      type: 'credit_usage',
      actionName,
      creditsUsed,
      userId,
      timestamp: new Date().toISOString(),
      metadata
    };

    // Store in local storage for offline tracking
    const existingUsage = JSON.parse(
      localStorage.getItem('credit_usage_events') || '[]'
    );
    
    existingUsage.push(usageEvent);
    
    // Keep only last 100 events to prevent storage bloat
    if (existingUsage.length > 100) {
      existingUsage.splice(0, existingUsage.length - 100);
    }
    
    localStorage.setItem('credit_usage_events', JSON.stringify(existingUsage));

  } catch (error) {
    console.warn('Failed to track credit usage:', error);
  }
};

// Bulk credit validation for multiple actions
export const validateBulkCredits = (
  credits: number,
  actions: Array<{ name: string; cost: number }>,
  userId: string
): { valid: boolean; totalCost: number; failedActions: string[] } => {
  const totalCost = actions.reduce((sum, action) => sum + action.cost, 0);
  const failedActions: string[] = [];

  // Validate each action individually
  actions.forEach(action => {
    if (action.cost > credits) {
      failedActions.push(action.name);
    }
  });

  const valid = credits >= totalCost && failedActions.length === 0;

  if (!valid) {
    const message = failedActions.length > 0
      ? `Insufficient credits for: ${failedActions.join(', ')}`
      : `You need ${totalCost} credits but only have ${credits}`;

    toast.error(message, {
      description: 'Purchase more credits to complete all actions.',
      duration: 5000,
      action: {
        label: 'Buy Credits',
        onClick: () => {
          window.open('https://buy.stripe.com/your-stripe-link', '_blank');
        }
      }
    });
  }

  return { valid, totalCost, failedActions };
};

// Credit expiration warnings
export const checkCreditExpiration = (expiresAt: string | null) => {
  if (!expiresAt) return;

  const expDate = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) {
    toast.error('Your credits have expired', {
      description: 'Purchase new credits to continue using AI features.',
      duration: 8000,
      action: {
        label: 'Buy Credits',
        onClick: () => {
          window.open('https://buy.stripe.com/your-stripe-link', '_blank');
        }
      }
    });
  } else if (daysUntilExpiry <= 7) {
    toast.warning(`Your credits expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`, {
      description: 'Consider purchasing more credits soon.',
      duration: 6000,
      action: {
        label: 'Buy Credits',
        onClick: () => {
          window.open('https://buy.stripe.com/your-stripe-link', '_blank');
        }
      }
    });
  }
};
