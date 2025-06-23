
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

interface QAResponse {
  answer: string;
  category: string;
  sources: number;
}

export const useQAAssistant = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const askQuestion = async (question: string): Promise<QAResponse | null> => {
    if (!user) {
      setError('User must be logged in');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
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
