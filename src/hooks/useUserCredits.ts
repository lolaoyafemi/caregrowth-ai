
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useUserCredits = () => {
  const [credits, setCredits] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedThisMonth, setUsedThisMonth] = useState<number>(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const { user } = useAuth();

  const fetchUserCredits = async () => {
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

    try {
      console.log('Fetching credits for user:', user.id);
      
      // Get user profile for credit balance (this is the authoritative source)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('credits, credits_expire_at')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // If no profile exists, try to create one
        if (profileError.code === 'PGRST116') {
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
          if (initialLoad) setCredits(0);
        } else {
          if (initialLoad) setCredits(0);
        }
      } else {
        console.log('Credits fetched from profile:', profile?.credits || 0);
        setCredits(profile?.credits || 0);
        setExpiresAt(profile?.credits_expire_at || null);
      }

      // Get credits used this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usageData, error: usageError } = await supabase
        .from('credit_usage_log')
        .select('credits_used')
        .eq('user_id', user.id)
        .gte('used_at', startOfMonth.toISOString());

      if (usageError) {
        console.error('Error fetching usage data:', usageError);
        if (initialLoad) setUsedThisMonth(0);
      } else {
        const totalUsed = usageData.reduce((sum, log) => sum + log.credits_used, 0);
        setUsedThisMonth(totalUsed);
      }

    } catch (error) {
      console.error('Error fetching user credits:', error);
      if (initialLoad) {
        setCredits(0);
        setExpiresAt(null);
        setUsedThisMonth(0);
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

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

  const refetch = () => {
    if (user) {
      console.log('Manual refetch triggered');
      fetchUserCredits();
    }
  };

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
