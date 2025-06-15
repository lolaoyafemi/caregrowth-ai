
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

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

export const useDocumentSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const searchDocuments = async (query: string): Promise<SearchResponse | null> => {
    if (!user) {
      setError('User must be logged in');
      return null;
    }

    setIsSearching(true);
    setError(null);

    try {
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

  return {
    searchDocuments,
    isSearching,
    error
  };
};
