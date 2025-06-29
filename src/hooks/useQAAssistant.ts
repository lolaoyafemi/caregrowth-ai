
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
  const { credits } = useUserCredits();

  const askQuestion = async (question: string): Promise<QAResponse | null> => {
    if (!user) {
      setError('User must be logged in');
      return null;
    }

    // Check credits before proceeding
    if (credits <= 0) {
      toast.error("You don't have enough credits to use Ask Jared. Please purchase more credits to continue.", {
        duration: 5000,
        action: {
          label: "Buy Credits",
          onClick: () => window.open('/payment', '_blank')
        }
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Deduct credits before making the API call (1 credit per question)
      const creditResult = await deductCredits(
        user.id, 
        'ask_jared', 
        1, 
        `Ask Jared question: ${question.substring(0, 50)}...`
      );

      if (!creditResult.success) {
        handleCreditError(creditResult);
        return null;
      }

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

      toast.success(`1 credit deducted. Remaining credits: ${creditResult.remainingCredits}`);
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
