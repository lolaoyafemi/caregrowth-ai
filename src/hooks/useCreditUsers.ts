
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User } from '@/types/credit';

export const useCreditUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      console.log('Loading users for credit management...');
      setLoading(true);
      
      // Fetch users with their synchronized credits from user_profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, business_name, credits')
        .not('email', 'is', null)
        .order('created_at', { ascending: false });

      console.log('User profiles query result:', { profiles, profilesError });

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        toast.error('Failed to load users');
        return;
      }

      if (profiles && profiles.length > 0) {
        const userList = profiles.map(profile => ({
          id: profile.user_id,
          email: profile.email || 'No email',
          name: profile.business_name || 'No name',
          credits: profile.credits || 0
        }));
        
        setUsers(userList);
        console.log('Loaded users:', userList.length);
      } else {
        console.log('No users found in user_profiles');
        toast.error('No users found in the system');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return {
    users,
    loading,
    loadUsers
  };
};
