
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminUser } from '@/types/admin';

export const fetchUsers = async (): Promise<AdminUser[]> => {
  try {
    console.log('=== ADMIN USER SERVICE: Starting to fetch users ===');
    
    // First, let's try fetching from users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('=== USERS TABLE QUERY ===');
    console.log('Users data:', usersData);
    console.log('Users error:', usersError);

    if (usersError) {
      console.error('Error fetching from users table:', usersError);
    }

    // Also try fetching from user_profiles table to get credits
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('=== USER_PROFILES TABLE QUERY ===');
    console.log('Profiles data:', profilesData);
    console.log('Profiles error:', profilesError);

    if (profilesError) {
      console.error('Error fetching from user_profiles table:', profilesError);
    }

    // Use whichever table has data
    let finalData = [];
    
    if (usersData && usersData.length > 0) {
      console.log('Using users table data');
      finalData = usersData.map((user, index) => {
        console.log(`Processing user ${index + 1} from users table:`, {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          credits: user.credits,
          created_at: user.created_at
        });
        
        return {
          id: user.id,
          email: user.email || '',
          name: user.name || 'No name',
          role: user.role || 'user',
          created_at: user.created_at || new Date().toISOString(),
          last_sign_in_at: null,
          credits: user.credits || 0,
          status: 'active' as 'active' | 'suspended'
        };
      });
    } else if (profilesData && profilesData.length > 0) {
      console.log('Using user_profiles table data');
      finalData = profilesData.map((profile, index) => {
        console.log(`Processing user ${index + 1} from user_profiles table:`, {
          id: profile.user_id,
          email: profile.email,
          role: profile.role,
          credits: profile.credits,
          created_at: profile.created_at
        });
        
        return {
          id: profile.user_id,
          email: profile.email || '',
          name: profile.business_name || 'No name',
          role: profile.role || 'user',
          created_at: profile.created_at || new Date().toISOString(),
          last_sign_in_at: profile.last_sign_in_at,
          credits: profile.credits || 0,
          status: profile.status as 'active' | 'suspended' || 'active'
        };
      });
    }

    console.log('=== FINAL RESULT ===');
    console.log('Final formatted users array:', finalData);
    console.log('Total users found:', finalData.length);
    console.log('=== END ADMIN USER SERVICE ===');
    
    return finalData;
  } catch (error) {
    console.error('=== ERROR IN ADMIN USER SERVICE ===');
    console.error('Error fetching users:', error);
    toast.error('Failed to load users');
    return [];
  }
};

export const suspendUser = async (userId: string): Promise<void> => {
  try {
    // Try updating user_profiles first, then users table
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ status: 'suspended' })
      .eq('user_id', userId);

    if (profileError) {
      console.log('Could not update user_profiles, trying users table');
      toast.error('Suspend user feature needs to be implemented for users table');
    } else {
      toast.success('User suspended successfully');
    }
  } catch (error) {
    console.error('Error suspending user:', error);
    toast.error('Failed to suspend user');
  }
};

export const activateUser = async (userId: string): Promise<void> => {
  try {
    // Try updating user_profiles first, then users table
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ status: 'active' })
      .eq('user_id', userId);

    if (profileError) {
      console.log('Could not update user_profiles, trying users table');
      toast.error('Activate user feature needs to be implemented for users table');
    } else {
      toast.success('User activated successfully');
    }
  } catch (error) {
    console.error('Error activating user:', error);
    toast.error('Failed to activate user');
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    // Try deleting from users table first
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (usersError) {
      console.log('Could not delete from users table, trying user_profiles');
      // Try deleting from user_profiles
      const { error: profilesError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (profilesError) {
        throw profilesError;
      }
    }
    
    toast.success('User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    toast.error('Failed to delete user');
  }
};

export const addCreditsToUser = async (userId: string, credits: number): Promise<void> => {
  try {
    // Try updating user_profiles first
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ credits: credits })
      .eq('user_id', userId);

    if (profileError) {
      console.log('Could not update user_profiles, trying users table');
      // Try updating users table
      const { error: usersError } = await supabase
        .from('users')
        .update({ credits: credits })
        .eq('id', userId);

      if (usersError) {
        throw usersError;
      }
    }
    
    toast.success('Credits added successfully');
  } catch (error) {
    console.error('Error adding credits:', error);
    toast.error('Failed to add credits');
  }
};
