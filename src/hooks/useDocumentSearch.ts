
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { deductCredits, handleCreditError } from '@/utils/creditUtils';
import { toast } from 'sonner';

interface SearchResult {
  documentTitle: string;
  documentUrl: string;
  relevantContent: string;
  pageNumber?: number;
  confidence: number;
}

interface SmartSearchResult {
  answer: string;
  sources: SearchResult[];
  tokensUsed?: number;
}

interface SearchResponse {
  results: SearchResult[];
  totalDocumentsSearched: number;
}

export const useDocumentSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const { credits } = useUserCredits();

  const searchDocuments = async (query: string): Promise<SearchResponse | null> => {
    if (!user) {
      setError('User must be logged in');
      return null;
    }

    // Check credits before proceeding
    if (credits <= 0) {
      toast.error("You don't have enough credits to use Document Search. Please purchase more credits to continue.", {
        duration: 5000,
        action: {
          label: "Buy Credits",
          onClick: () => window.open('/payment', '_blank')
        }
      });
      return null;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Deduct credits before making the API call (1 credit per search)
      const creditResult = await deductCredits(
        user.id, 
        'document_search', 
        1, 
        `Document search: ${query.substring(0, 50)}...`
      );

      if (!creditResult.success) {
        handleCreditError(creditResult);
        return null;
      }

      const { data, error: functionError } = await supabase.functions.invoke('document-search', {
        body: {
          query: query.trim(),
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
      return data as SearchResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search documents';
      setError(errorMessage);
      console.error('Document search error:', err);
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const smartSearchDocuments = async (query: string): Promise<SmartSearchResult | null> => {
    if (!user) {
      setError('User must be logged in');
      return null;
    }

    // Check credits before proceeding
    if (credits <= 0) {
      toast.error("You don't have enough credits to use Smart Document Search. Please purchase more credits to continue.", {
        duration: 5000,
        action: {
          label: "Buy Credits",
          onClick: () => window.open('/payment', '_blank')
        }
      });
      return null;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Deduct credits before making the API call (2 credits for smart search as it uses AI)
      const creditResult = await deductCredits(
        user.id, 
        'smart_document_search', 
        2, 
        `Smart document search: ${query.substring(0, 50)}...`
      );

      if (!creditResult.success) {
        handleCreditError(creditResult);
        return null;
      }

      const { data, error: functionError } = await supabase.functions.invoke('smart-document-search', {
        body: {
          query: query.trim(),
          userId: user.id
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`2 credits deducted. Remaining credits: ${creditResult.remainingCredits}`);
      return data as SmartSearchResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform smart search';
      setError(errorMessage);
      console.error('Smart document search error:', err);
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchDocuments,
    smartSearchDocuments,
    isSearching,
    error
  };
};
