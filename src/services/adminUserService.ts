
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminUser } from '@/types/admin';

export const fetchUsers = async (): Promise<AdminUser[]> => {
  try {
    console.log('Fetching users from user_profiles table...');
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Raw user data from database:', data);
    console.log('Database error (if any):', error);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    const formattedUsers = data?.map(user => {
      console.log('Processing user:', user.user_id, user.email);
      return {
        id: user.user_id,
        email: user.email || '',
        name: user.business_name || 'No name',
        role: user.role || 'user',
        created_at: user.created_at || new Date().toISOString(),
        last_sign_in_at: user.last_sign_in_at,
        credits: user.credits || 0,
        status: (user.status || 'active') as 'active' | 'suspended'
      };
    }) || [];
    
    console.log('Formatted users array:', formattedUsers);
    console.log('Total users found:', formattedUsers.length);
    
    return formattedUsers;
  } catch (error) {
    console.error('Error fetching users:', error);
    toast.error('Failed to load users');
    return [];
  }
};

export const suspendUser = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ status: 'suspended' })
      .eq('user_id', userId);

    if (error) throw error;
    
    toast.success('User suspended successfully');
  } catch (error) {
    console.error('Error suspending user:', error);
    toast.error('Failed to suspend user');
  }
};

export const activateUser = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ status: 'active' })
      .eq('user_id', userId);

    if (error) throw error;
    
    toast.success('User activated successfully');
  } catch (error) {
    console.error('Error activating user:', error);
    toast.error('Failed to activate user');
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    
    toast.success('User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    toast.error('Failed to delete user');
  }
};

export const addCreditsToUser = async (userId: string, credits: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ credits: credits })
      .eq('user_id', userId);

    if (error) throw error;
    
    toast.success('Credits added successfully');
  } catch (error) {
    console.error('Error adding credits:', error);
    toast.error('Failed to add credits');
  }
};
