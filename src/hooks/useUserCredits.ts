
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useUserCredits = () => {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUserCredits = async () => {
    if (!user) {
      setCredits(0);
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching credits for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user credits:', error);
        // If no profile exists, try to create one
        if (error.code === 'PGRST116') {
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
          setCredits(0);
        } else {
          setCredits(0);
        }
      } else {
        console.log('Credits fetched:', data?.credits || 0);
        setCredits(data?.credits || 0);
      }
    } catch (error) {
      console.error('Error fetching user credits:', error);
      setCredits(0);
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

  return { credits, loading, refetch };
};
