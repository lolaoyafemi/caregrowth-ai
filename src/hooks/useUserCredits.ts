
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { withCache, cacheKeys, invalidateCache } from '@/lib/cache';
import { handleAsyncError } from '@/lib/errors';

export const useUserCredits = () => {
  const [credits, setCredits] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedThisMonth, setUsedThisMonth] = useState<number>(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const { user } = useAuth();

  // Optimized fetch function with caching and error handling
  const fetchUserCredits = useCallback(async (useCache = true) => {
    if (!user) {
      setCredits(0);
      setExpiresAt(null);
      setUsedThisMonth(0);
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    // Only show loading on initial load, not on subsequent refreshes
    if (initialLoad) {
      setLoading(true);
    }

    const fetchData = async () => {
      console.log('Fetching credits for user:', user.id);
      
      // First, expire old credits by calling the database function
      await supabase.rpc('expire_old_credits', { p_user_id: user.id });
      
      // Get user profile for credit balance (this is the authoritative source)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('credits, credits_expire_at')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle to avoid errors when no profile exists

      let currentCredits = 0;
      let currentExpiresAt: string | null = null;

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      } else if (profile) {
        console.log('Credits fetched from profile:', profile.credits || 0);
        currentCredits = profile.credits || 0;
        currentExpiresAt = profile.credits_expire_at || null;
      } else {
        // No profile exists, create one
        console.log('No profile found, creating one...');
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            credits: 0
          });
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
        }
      }

      // Get credits used this month with caching
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthKey = startOfMonth.toISOString().slice(0, 7);

      const usagePromise = async () => {
        const { data: usageData, error: usageError } = await supabase
          .from('credit_usage_log')
          .select('credits_used')
          .eq('user_id', user.id)
          .gte('used_at', startOfMonth.toISOString());

        if (usageError) {
          console.error('Error fetching usage data:', usageError);
          return 0;
        }

        return usageData.reduce((sum, log) => sum + log.credits_used, 0);
      };

      const totalUsed = useCache 
        ? await withCache(cacheKeys.creditUsage(user.id, monthKey), usagePromise, 2 * 60 * 1000) // 2 minutes cache
        : await usagePromise();

      return {
        credits: currentCredits,
        expiresAt: currentExpiresAt,
        usedThisMonth: totalUsed
      };
    };

    const { data, error } = await handleAsyncError(
      () => useCache 
        ? withCache(cacheKeys.userCredits(user.id), fetchData, 30000) // 30 seconds cache
        : fetchData(),
      'fetchUserCredits'
    );

    if (error) {
      console.error(error);
      if (initialLoad) {
        setCredits(0);
        setExpiresAt(null);
        setUsedThisMonth(0);
      }
    } else if (data) {
      setCredits(data.credits);
      setExpiresAt(data.expiresAt);
      setUsedThisMonth(data.usedThisMonth);
    }

    setLoading(false);
    setInitialLoad(false);
  }, [user, initialLoad]);

  useEffect(() => {
    fetchUserCredits();

    // Set up comprehensive real-time subscriptions
    if (user) {
      console.log('Setting up real-time subscriptions for user:', user.id);
      
      // Listen for database changes on credit-related tables
      const creditUpdatesChannel = supabase
        .channel('credit-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'credit_usage_log',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Credit usage update received:', payload);
            fetchUserCredits();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'credit_purchases',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Credit purchase update received:', payload);
            fetchUserCredits();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('User profile update received:', payload);
            fetchUserCredits();
          }
        )
        .on(
          'broadcast',
          { event: 'credit_deducted' },
          (payload) => {
            console.log('Real-time credit deduction broadcast received:', payload);
            if (payload.payload.userId === user.id) {
              console.log('Credit deduction for current user, updating credits');
              // Update credits immediately
              setCredits(payload.payload.remainingCredits);
              // Also refetch to get the most accurate data
              fetchUserCredits();
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });

      return () => {
        console.log('Cleaning up real-time subscriptions');
        supabase.removeChannel(creditUpdatesChannel);
      };
    }
  }, [user]);

  const refetch = useCallback(() => {
    if (user) {
      console.log('Manual refetch triggered');
      fetchUserCredits(false); // Force fresh data
    }
  }, [user, fetchUserCredits]);

  const getExpirationInfo = () => {
    if (!expiresAt) return null;
    
    const expDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      expiresAt: expDate,
      daysUntilExpiry,
      isExpiringSoon: daysUntilExpiry <= 7,
      isExpired: daysUntilExpiry <= 0
    };
  };

  const getTotalCredits = () => {
    return credits + usedThisMonth;
  };

  const getUsagePercentage = () => {
    const total = getTotalCredits();
    if (total === 0) return 0;
    return Math.round((usedThisMonth / total) * 100);
  };

  return { 
    credits, 
    expiresAt,
    loading: loading && initialLoad, // Only show loading on initial load
    refetch, 
    getExpirationInfo,
    usedThisMonth,
    getTotalCredits,
    getUsagePercentage
  };
};
