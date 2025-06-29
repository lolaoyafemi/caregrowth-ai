
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { toast } from 'sonner';

interface QAResponse {
  answer: string;
  category: string;
  sources: number;
}

export const useQAAssistant = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const { credits, refetch } = useUserCredits();

  const askQuestion = async (question: string): Promise<QAResponse | null> => {
    if (!user) {
      setError('User must be logged in');
      return null;
    }

    // Check credits before proceeding (1 credit per question)
    if (credits < 1) {
      toast.error("You need at least 1 credit to use Ask Jared. Please purchase more credits to continue.", {
        duration: 5000,
        action: {
          label: "Buy Credits",
          onClick: () => window.open('/stripe-payment', '_blank')
        }
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, make the API call to avoid deducting credits if the request fails
      const { data, error: functionError } = await supabase.functions.invoke('qa-assistant', {
        body: {
          question: question.trim(),
          userId: user.id
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Only deduct credits after successful API call
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          credits: credits - 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        toast.error('Failed to deduct credits');
        throw new Error('Failed to deduct credits');
      }

      // Log the credit usage
      const { error: logError } = await supabase
        .from('credit_usage_log')
        .insert({
          user_id: user.id,
          tool: 'ask_jared',
          credits_used: 1,
          description: `Ask Jared question: ${question.substring(0, 50)}...`,
          used_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Error logging credit usage:', logError);
      }

      // Refresh credits to reflect the deduction
      refetch();
      
      toast.success(`1 credit deducted. Remaining credits: ${credits - 1}`);
      return data as QAResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get answer';
      setError(errorMessage);
      console.error('Ask Jared error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getQAHistory = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('qna_logs')
        .select('*')
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching Ask Jared history:', err);
      return [];
    }
  };

  return {
    askQuestion,
    getQAHistory,
    isLoading,
    error
  };
};
