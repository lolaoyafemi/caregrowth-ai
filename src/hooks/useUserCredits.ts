
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useUserCredits = () => {
  const [credits, setCredits] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedThisMonth, setUsedThisMonth] = useState<number>(0);
  const { user } = useAuth();

  const fetchUserCredits = async () => {
    if (!user) {
      setCredits(0);
      setExpiresAt(null);
      setUsedThisMonth(0);
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching credits for user:', user.id);
      
      // Get active credits using the new function
      const { data: activeCredits, error: creditsError } = await supabase.rpc('get_active_credits', {
        p_user_id: user.id
      });

      if (creditsError) {
        console.error('Error fetching active credits:', creditsError);
        setCredits(0);
      } else {
        console.log('Active credits fetched:', activeCredits || 0);
        setCredits(activeCredits || 0);
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
        setUsedThisMonth(0);
      } else {
        const totalUsed = usageData.reduce((sum, log) => sum + log.credits_used, 0);
        setUsedThisMonth(totalUsed);
      }

      // Get user profile for expiration date
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('credits_expire_at')
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
              credits: activeCredits || 0
            });
          
          if (insertError) {
            console.error('Error creating profile:', insertError);
          }
        }
        setExpiresAt(null);
      } else {
        setExpiresAt(profile?.credits_expire_at || null);
      }
    } catch (error) {
      console.error('Error fetching user credits:', error);
      setCredits(0);
      setExpiresAt(null);
      setUsedThisMonth(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCredits();

    // Set up real-time subscription for credit usage updates
    if (user) {
      const channel = supabase
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
            console.log('Credit usage update:', payload);
            // Refetch data when new usage is logged
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
            console.log('User profile update:', payload);
            // Refetch data when profile is updated
            fetchUserCredits();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const refetch = () => {
    if (user) {
      setLoading(true);
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
    loading, 
    refetch, 
    getExpirationInfo,
    usedThisMonth,
    getTotalCredits,
    getUsagePercentage
  };
};
