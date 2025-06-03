
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreditDeductionResult {
  success: boolean;
  error?: string;
  previousCredits?: number;
  creditsUsed?: number;
  remainingCredits?: number;
  logId?: string;
}

export const deductCredits = async (
  userId: string, 
  tool: string, 
  creditsToUse: number, 
  description?: string
): Promise<CreditDeductionResult> => {
  try {
    console.log('Deducting credits:', { userId, tool, creditsToUse, description });

    const { data, error } = await supabase.rpc('deduct_credits_and_log', {
      p_user_id: userId,
      p_tool: tool,
      p_credits_used: creditsToUse,
      p_description: description
    });

    if (error) {
      console.error('Error deducting credits:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('Credit deduction result:', data);
    return data as CreditDeductionResult;
  } catch (error) {
    console.error('Exception during credit deduction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const handleCreditError = (result: CreditDeductionResult) => {
  if (result.error === 'Insufficient credits') {
    toast.error(`Insufficient credits. You need ${result.creditsUsed || 0} credits but only have ${result.previousCredits || 0}.`);
  } else if (result.error === 'User not found') {
    toast.error('User account not found. Please try logging in again.');
  } else {
    toast.error(`Credit deduction failed: ${result.error}`);
  }
};
