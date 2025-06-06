
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useUserCredits = () => {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserCredits = async () => {
      if (!user) {
        setCredits(0);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('credits')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user credits:', error);
          setCredits(0);
        } else {
          setCredits(data?.credits || 0);
        }
      } catch (error) {
        console.error('Error fetching user credits:', error);
        setCredits(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCredits();
  }, [user]);

  return { credits, loading, refetch: () => {
    if (user) {
      setLoading(true);
      // Re-run the fetch logic
      const fetchUserCredits = async () => {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('credits')
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching user credits:', error);
            setCredits(0);
          } else {
            setCredits(data?.credits || 0);
          }
        } catch (error) {
          console.error('Error fetching user credits:', error);
          setCredits(0);
        } finally {
          setLoading(false);
        }
      };
      fetchUserCredits();
    }
  }};
};
