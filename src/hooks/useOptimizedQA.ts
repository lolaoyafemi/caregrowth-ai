import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { deductCredits, handleCreditError } from '@/utils/creditUtils';
import { toast } from 'sonner';

interface QAStreamResponse {
  answer: string;
  category: string;
  sources: number;
  responseTime?: number;
  tokensUsed?: number;
}

interface CachedResponse {
  answer: string;
  category: string;
  timestamp: number;
  responseTime: number;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  totalRequests: number;
  cacheHitRate: number;
  errorRate: number;
}

export const useOptimizedQA = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    averageResponseTime: 0,
    totalRequests: 0,
    cacheHitRate: 0,
    errorRate: 0
  });

  const { user } = useUser();
  const { credits, refetch } = useUserCredits();
  
  const requestQueue = useRef<Array<() => Promise<void>>>([]);
  const isProcessingQueue = useRef(false);
  const cache = useRef<Map<string, CachedResponse>>(new Map());
  const abortController = useRef<AbortController | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const metricsRef = useRef(metrics);

  // Update metrics ref when state changes
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  // Load cache from localStorage
  useEffect(() => {
    if (user) {
      try {
        const savedCache = localStorage.getItem(`qa-cache-${user.id}`);
        if (savedCache) {
          const parsed = JSON.parse(savedCache);
          cache.current = new Map(Object.entries(parsed));
          console.log('QA cache loaded:', cache.current.size, 'entries');
        }
      } catch (error) {
        console.error('Error loading QA cache:', error);
      }
    }
  }, [user]);

  // Save cache to localStorage
  const saveCache = useCallback(() => {
    if (user && cache.current.size > 0) {
      try {
        const cacheObj = Object.fromEntries(cache.current);
        localStorage.setItem(`qa-cache-${user.id}`, JSON.stringify(cacheObj));
      } catch (error) {
        console.error('Error saving QA cache:', error);
      }
    }
  }, [user]);

  // Check cache for existing answer
  const getCachedAnswer = useCallback((question: string): CachedResponse | null => {
    const cacheKey = question.toLowerCase().trim();
    const cached = cache.current.get(cacheKey);
    
    if (cached) {
      // Check if cache is still valid (24 hours)
      const isValid = Date.now() - cached.timestamp < 24 * 60 * 60 * 1000;
      if (isValid) {
        console.log('Cache hit for question:', question.substring(0, 50));
        return cached;
      } else {
        cache.current.delete(cacheKey);
        saveCache();
      }
    }
    
    return null;
  }, [saveCache]);

  // Cache answer
  const cacheAnswer = useCallback((question: string, answer: string, category: string, responseTime: number) => {
    const cacheKey = question.toLowerCase().trim();
    cache.current.set(cacheKey, {
      answer,
      category,
      timestamp: Date.now(),
      responseTime
    });
    
    // Limit cache size (keep last 100 entries)
    if (cache.current.size > 100) {
      const firstKey = cache.current.keys().next().value;
      cache.current.delete(firstKey);
    }
    
    saveCache();
  }, [saveCache]);

  // Update performance metrics
  const updateMetrics = useCallback((responseTime: number, wasError: boolean, wasCacheHit: boolean) => {
    setMetrics(prev => {
      const newTotalRequests = prev.totalRequests + 1;
      const newAverageResponseTime = (prev.averageResponseTime * prev.totalRequests + responseTime) / newTotalRequests;
      const cacheHits = wasCacheHit ? 1 : 0;
      const newCacheHitRate = ((prev.cacheHitRate * prev.totalRequests) + cacheHits) / newTotalRequests;
      const errors = wasError ? 1 : 0;
      const newErrorRate = ((prev.errorRate * prev.totalRequests) + errors) / newTotalRequests;

      return {
        averageResponseTime: newAverageResponseTime,
        totalRequests: newTotalRequests,
        cacheHitRate: newCacheHitRate,
        errorRate: newErrorRate
      };
    });
  }, []);

  // Process request queue
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current || requestQueue.current.length === 0) return;
    
    isProcessingQueue.current = true;
    
    while (requestQueue.current.length > 0) {
      const request = requestQueue.current.shift();
      if (request) {
        await request();
        // Small delay between requests to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    isProcessingQueue.current = false;
  }, []);

  // Retry logic with exponential backoff
  const retryWithBackoff = useCallback(async (
    fn: () => Promise<any>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt} failed, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        setConnectionStatus('reconnecting');
      }
    }
  }, []);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
      setIsLoading(false);
      setIsStreaming(false);
      toast.info('Request cancelled');
    }
  }, []);

  // Main ask question function with streaming
  const askQuestionStream = useCallback(async (
    question: string,
    conversationHistory: any[] = [],
    onChunk?: (chunk: string, fullResponse: string) => void
  ): Promise<QAStreamResponse | null> => {
    if (!user) {
      setError('User must be logged in');
      return null;
    }

    // Check cache first
    const startTime = Date.now();
    const cached = getCachedAnswer(question);
    if (cached) {
      updateMetrics(cached.responseTime, false, true);
      if (onChunk) {
        // Simulate streaming from cache
        const words = cached.answer.split(' ');
        let currentText = '';
        for (const word of words) {
          currentText += (currentText ? ' ' : '') + word;
          onChunk(word + ' ', currentText);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      return {
        answer: cached.answer,
        category: cached.category,
        sources: 1,
        responseTime: cached.responseTime
      };
    }

    // Check credits
    if (credits < 1) {
      toast.error("You need at least 1 credit to use Ask Jared. Please purchase more credits to continue.", {
        duration: 5000,
        action: {
          label: "Buy Credits",
          onClick: () => window.location.href = '/stripe-payment'
        }
      });
      return null;
    }

    return new Promise((resolve) => {
      const executeRequest = async () => {
        setIsLoading(true);
        setIsStreaming(true);
        setError(null);
        setConnectionStatus('connected');

        abortController.current = new AbortController();

        try {
          const response = await retryWithBackoff(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('No session');

            const supabaseUrl = 'https://ljtikbkilyeyuexzhaqd.supabase.co';
            return fetch(
              `${supabaseUrl}/functions/v1/qa-assistant-stream`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  question: question.trim(),
                  conversationHistory
                }),
                signal: abortController.current?.signal
              }
            );
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          let fullResponse = '';
          let category = 'general';
          let responseTime = 0;
          let tokensUsed = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
              try {
                const data = JSON.parse(line.substring(6));
                
                if (data.type === 'content') {
                  if (onChunk) {
                    onChunk(data.content, data.fullResponse);
                  }
                  fullResponse = data.fullResponse;
                } else if (data.type === 'metadata') {
                  responseTime = data.responseTime;
                  tokensUsed = data.tokensUsed;
                  fullResponse = data.fullResponse;
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }

          // Deduct credits after successful response
          const deductionResult = await deductCredits(
            user.id,
            'ask_jared',
            1,
            `Ask Jared question: ${question.substring(0, 50)}...`
          );

          if (!deductionResult.success) {
            handleCreditError(deductionResult);
            throw new Error('Failed to deduct credits');
          }

          refetch();
          
          // Cache the response
          cacheAnswer(question, fullResponse, category, responseTime);
          
          // Update metrics
          updateMetrics(responseTime, false, false);
          
          toast.success(`1 credit deducted. Remaining credits: ${deductionResult.remainingCredits}`);
          
          const result: QAStreamResponse = {
            answer: fullResponse,
            category,
            sources: 1,
            responseTime,
            tokensUsed
          };
          
          resolve(result);
          
        } catch (err: any) {
          const responseTime = Date.now() - startTime;
          updateMetrics(responseTime, true, false);
          
          if (err.name === 'AbortError') {
            resolve(null);
            return;
          }
          
          const errorMessage = err instanceof Error ? err.message : 'Failed to get answer';
          setError(errorMessage);
          setConnectionStatus('disconnected');
          console.error('Ask Jared streaming error:', err);
          resolve(null);
        } finally {
          setIsLoading(false);
          setIsStreaming(false);
          abortController.current = null;
        }
      };

      // Add to queue
      requestQueue.current.push(executeRequest);
      processQueue();
    });
  }, [user, credits, getCachedAnswer, cacheAnswer, updateMetrics, retryWithBackoff, refetch, processQueue]);

  // Debounced version of ask question
  const askQuestionDebounced = useCallback((
    question: string,
    conversationHistory: any[] = [],
    onChunk?: (chunk: string, fullResponse: string) => void,
    delay: number = 300
  ) => {
    return new Promise<QAStreamResponse | null>((resolve) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(async () => {
        const result = await askQuestionStream(question, conversationHistory, onChunk);
        resolve(result);
      }, delay);
    });
  }, [askQuestionStream]);

  // Get QA history
  const getQAHistory = useCallback(async () => {
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
  }, [user]);

  // Clear cache
  const clearCache = useCallback(() => {
    cache.current.clear();
    if (user) {
      localStorage.removeItem(`qa-cache-${user.id}`);
    }
    toast.success('Cache cleared');
  }, [user]);

  return {
    askQuestion: askQuestionStream,
    askQuestionDebounced,
    getQAHistory,
    cancelRequest,
    clearCache,
    isLoading,
    isStreaming,
    error,
    connectionStatus,
    metrics,
    cacheSize: cache.current.size
  };
};
