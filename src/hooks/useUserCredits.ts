
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useUserCredits = () => {
  const [credits, setCredits] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUserCredits = async () => {
    if (!user) {
      setCredits(0);
      setExpiresAt(null);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCredits();
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

  return { 
    credits, 
    expiresAt,
    loading, 
    refetch, 
    getExpirationInfo 
  };
};
