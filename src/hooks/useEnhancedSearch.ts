import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCredits } from './useUserCredits';
import { toast } from 'sonner';

interface SmartSearchResult {
  answer: string;
  sources: Array<{
    documentTitle: string;
    documentUrl: string;
    relevantContent: string;
    pageNumber?: number;
    confidence: number;
  }>;
  tokensUsed?: number;
}

interface SearchResult {
  documentTitle: string;
  documentUrl: string;
  relevantContent: string;
  pageNumber?: number;
  confidence: number;
}

interface SearchResponse {
  results: SearchResult[];
  totalDocumentsSearched: number;
}

export const useEnhancedSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { credits, refetch } = useUserCredits();

  const validateSearchRequest = (query: string): boolean => {
    if (!user) {
      toast.error("Please sign in to search documents");
      return false;
    }

    if (!query?.trim()) {
      toast.error("Please enter a search query");
      return false;
    }

    if (!credits || credits < 1) {
      toast.error("Insufficient credits for search");
      return false;
    }

    return true;
  };

  const performSmartSearch = async (query: string): Promise<SmartSearchResult | null> => {
    if (!validateSearchRequest(query)) return null;

    setIsSearching(true);
    setError(null);

    try {
      console.log('Starting enhanced smart search', { queryLength: query.length });

      const { data, error: searchError } = await supabase.functions.invoke('smart-document-search-v2', {
        body: { question: query.trim() }
      });

      if (searchError) {
        console.error('Smart search error', searchError);
        throw new Error(searchError.message || 'Search failed');
      }

      if (!data) {
        toast.info("No relevant content found in your documents");
        return null;
      }

      // Deduct credit and refresh
      const { error: creditError } = await supabase.functions.invoke('secure-credit-operation', {
        body: { 
          operation: 'deduct', 
          amount: 1, 
          description: 'Smart document search' 
        }
      });

      if (creditError) {
        console.error('Credit deduction failed', creditError);
      } else {
        await refetch();
      }

      console.log('Smart search completed', { 
        sourcesFound: data.sources?.length || 0,
        hasAnswer: !!data.answer 
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Smart search failed', err);
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const performBasicSearch = async (query: string): Promise<SearchResponse | null> => {
    if (!validateSearchRequest(query)) return null;

    setIsSearching(true);
    setError(null);

    try {
      console.log('Starting enhanced basic search', { queryLength: query.length });

      const { data, error: searchError } = await supabase.functions.invoke('document-search', {
        body: { query: query.trim() }
      });

      if (searchError) {
        console.error('Basic search error', searchError);
        throw new Error(searchError.message || 'Search failed');
      }

      // Deduct credit and refresh
      const { error: creditError } = await supabase.functions.invoke('secure-credit-operation', {
        body: { 
          operation: 'deduct', 
          amount: 1, 
          description: 'Document search' 
        }
      });

      if (creditError) {
        console.error('Credit deduction failed', creditError);
      } else {
        await refetch();
      }

      const results = data || { results: [], totalDocumentsSearched: 0 };
      
      console.log('Basic search completed', { 
        resultsFound: results.results?.length || 0,
        documentsSearched: results.totalDocumentsSearched || 0
      });

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Basic search failed', err);
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  return {
    smartSearch: performSmartSearch,
    basicSearch: performBasicSearch,
    isSearching,
    error
  };
};