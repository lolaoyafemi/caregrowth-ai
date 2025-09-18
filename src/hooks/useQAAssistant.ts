import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { deductCredits, handleCreditError } from '@/utils/creditUtils';
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

    console.log('=== ASK JARED START ===');
    console.log('User:', user.id);
    console.log('Current credits:', credits);
    console.log('Question:', question.substring(0, 100) + '...');

    // Check credits before proceeding (1 credit per question)
    if (credits < 1) {
      console.log('Insufficient credits for Ask Jared');
      toast.error("You need at least 1 credit to use Ask Jared. Please purchase more credits to continue.", {
        duration: 5000,
        action: {
          label: "Buy Credits",
          onClick: () => window.open('https://buy.stripe.com/3cI28sbNC05F3QCeXHbsc0y?success_url=https%3A%2F%2Fwww.caregrowthassistant.com%2Fpayment-success%3Fsession_id%3D%7BCHECKOUT_SESSION_ID%7D', '_blank')
        }
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Making API call to qa-assistant...');
      // First, make the API call to avoid deducting credits if the request fails
      const { data, error: functionError } = await supabase.functions.invoke('qa-assistant', {
        body: {
          question: question.trim(),
          userId: user.id
        }
      });

      console.log('qa-assistant response data:', data);
      console.log('qa-assistant response error:', functionError);

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('API call successful, now deducting credits...');
      // Only deduct credits after successful API call
      const deductionResult = await deductCredits(
        user.id, 
        'ask_jared', 
        1, 
        `Ask Jared question: ${question.substring(0, 50)}...`
      );

      console.log('Deduction result:', deductionResult);

      if (!deductionResult.success) {
        handleCreditError(deductionResult);
        throw new Error('Failed to deduct credits');
      }

      // Refresh credits to reflect the deduction
      console.log('Refreshing credits...');
      refetch();
      
      toast.success(`1 credit deducted. Remaining credits: ${deductionResult.remainingCredits}`);
      console.log('=== ASK JARED END ===');
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
