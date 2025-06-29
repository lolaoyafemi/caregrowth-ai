
import { toast } from 'sonner';

export const validateCreditsBeforeAction = (credits: number, actionName: string): boolean => {
  if (credits <= 0) {
    toast.error(`Insufficient credits to use ${actionName}. Please purchase more credits to continue.`, {
      duration: 5000,
      action: {
        label: 'Buy Credits',
        onClick: () => {
          window.location.href = '/stripe-payment';
        }
      }
    });
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
        window.location.href = '/stripe-payment';
      }
    }
  });
};
