
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

interface DeductCreditsResponse {
  success: boolean;
  error?: string;
  available_credits?: number;
  requested_credits?: number;
  credits_deducted?: number;
  remaining_credits?: number;
}

export const deductCredits = async (
  userId: string, 
  tool: string, 
  creditsToUse: number, 
  description?: string
): Promise<CreditDeductionResult> => {
  try {
    console.log('Deducting credits:', { userId, tool, creditsToUse, description });

    // Use the new FIFO credit deduction function
    const { data, error } = await supabase.rpc('deduct_credits_fifo', {
      p_user_id: userId,
      p_credits_to_deduct: creditsToUse
    });

    if (error) {
      console.error('Error deducting credits:', error);
      return {
        success: false,
        error: 'Failed to deduct credits'
      };
    }

    // Safely handle the response - check if it's an object with the expected structure
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      console.error('Invalid response format from deduct_credits_fifo:', data);
      return {
        success: false,
        error: 'Invalid response from credit deduction'
      };
    }

    // Now we can safely cast to our expected type
    const response = data as DeductCreditsResponse;

    if (!('success' in response)) {
      console.error('Response missing success property:', response);
      return {
        success: false,
        error: 'Invalid response structure from credit deduction'
      };
    }

    if (!response.success) {
      return {
        success: false,
        error: response.error,
        previousCredits: response.available_credits,
        creditsUsed: creditsToUse
      };
    }

    // Log the credit usage
    const { data: logData, error: logError } = await supabase
      .from('credit_usage_log')
      .insert({
        user_id: userId,
        tool: tool,
        credits_used: creditsToUse,
        description: description,
        used_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Error logging credit usage:', logError);
      // Don't fail the operation if logging fails
    }

    console.log('Credit deduction successful:', {
      creditsUsed: creditsToUse,
      remainingCredits: response.remaining_credits
    });
    
    return {
      success: true,
      creditsUsed: creditsToUse,
      remainingCredits: response.remaining_credits,
      logId: logData?.id
    };
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
