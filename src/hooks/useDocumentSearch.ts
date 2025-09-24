
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
  const { credits, refetch } = useUserCredits();

  const searchDocuments = async (query: string): Promise<SearchResponse | null> => {
    if (!user) {
      setError('User must be logged in');
      return null;
    }

    console.log('=== DOCUMENT SEARCH START ===');
    console.log('User:', user.id);
    console.log('Current credits:', credits);
    console.log('Query:', query.substring(0, 100) + '...');

    // Check credits before proceeding (1 credit per search)
    if (credits < 1) {
      console.log('Insufficient credits for Document Search');
      toast.error("You need at least 1 credit to use Document Search. Please purchase more credits to continue.", {
        duration: 5000,
        action: {
          label: "Buy Credits",
          onClick: () => window.location.href = '/stripe-payment'
        }
      });
      return null;
    }

    setIsSearching(true);
    setError(null);

    try {
      console.log('Making API call to document-search...');
      // First, make the API call to avoid deducting credits if the search fails
      const { data, error: functionError } = await supabase.functions.invoke('document-search', {
        body: {
          query: query.trim(),
          userId: user.id
        }
      });

      console.log('document-search response data:', data);
      console.log('document-search response error:', functionError);

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('API call successful, now deducting credits...');
      // Only deduct credits after successful search
      const deductionResult = await deductCredits(
        user.id, 
        'document_search', 
        1, 
        `Document search: ${query.substring(0, 50)}...`
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
      console.log('=== DOCUMENT SEARCH END ===');
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

    console.log('=== FAST SMART DOCUMENT SEARCH START ===');
    console.log('User:', user.id);
    console.log('Current credits:', credits);
    console.log('Query:', query.substring(0, 100) + '...');

    // Check credits before proceeding (1 credit for fast search)
    if (credits < 1) {
      console.log('Insufficient credits for Smart Document Search');
      toast.error("You need at least 1 credit to use Smart Document Search. Please purchase more credits to continue.", {
        duration: 5000,
        action: {
          label: "Buy Credits",
          onClick: () => window.location.href = '/stripe-payment'
        }
      });
      return null;
    }

    setIsSearching(true);
    setError(null);

    try {
      console.log('Making API call to smart-document-search-fast...');
      // First, make the API call to avoid deducting credits if the search fails
      const { data, error: functionError } = await supabase.functions.invoke('smart-document-search-fast', {
        body: {
          query: query.trim(),
          userId: user.id
        }
      });

      console.log('fast-search response data:', data);
      console.log('fast-search response error:', functionError);

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('API call successful, now deducting credits...');
      // Only deduct credits after successful search (reduced to 1 credit)
      const deductionResult = await deductCredits(
        user.id, 
        'fast_document_search', 
        1, 
        `Fast document search: ${query.substring(0, 50)}...`
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
      console.log('=== FAST SMART DOCUMENT SEARCH END ===');
      return data as SmartSearchResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform smart search';
      setError(errorMessage);
      console.error('Fast document search error:', err);
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
