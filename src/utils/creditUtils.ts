
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

    // Get current credits from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return {
        success: false,
        error: 'User profile not found'
      };
    }

    const currentCredits = profile.credits || 0;

    // Check if user has enough credits
    if (currentCredits < creditsToUse) {
      return {
        success: false,
        error: 'Insufficient credits',
        previousCredits: currentCredits,
        creditsUsed: creditsToUse
      };
    }

    const newCredits = currentCredits - creditsToUse;

    // Update credits in user_profiles table
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        credits: newCredits,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return {
        success: false,
        error: 'Failed to update credits'
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
      previousCredits: currentCredits,
      creditsUsed: creditsToUse,
      remainingCredits: newCredits
    });
    
    return {
      success: true,
      previousCredits: currentCredits,
      creditsUsed: creditsToUse,
      remainingCredits: newCredits,
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
