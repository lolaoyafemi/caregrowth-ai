
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminUser } from '@/types/admin';

export const fetchUsers = async (): Promise<AdminUser[]> => {
  try {
    console.log('=== ADMIN USER SERVICE: Starting to fetch users ===');
    console.log('Fetching users from users table...');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('=== RAW DATABASE RESPONSE ===');
    console.log('Raw user data from database:', data);
    console.log('Database error (if any):', error);
    console.log('Data length:', data?.length || 0);

    if (error) {
      console.error('Database error details:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('No users found in users table');
      console.log('This might mean:');
      console.log('1. The table is empty');
      console.log('2. There are RLS policies blocking access');
      console.log('3. The user doesnt have permission to read this table');
      return [];
    }
    
    console.log('=== PROCESSING USERS ===');
    const formattedUsers = data.map((user, index) => {
      console.log(`Processing user ${index + 1}:`, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        credits: user.credits
      });
      
      return {
        id: user.id,
        email: user.email || '',
        name: user.name || 'No name',
        role: user.role || 'user',
        created_at: user.created_at || new Date().toISOString(),
        last_sign_in_at: null, // users table doesn't have this field
        credits: user.credits || 0,
        status: 'active' as 'active' | 'suspended' // users table doesn't have status field
      };
    });
    
    console.log('=== FINAL RESULT ===');
    console.log('Formatted users array:', formattedUsers);
    console.log('Total users found:', formattedUsers.length);
    console.log('=== END ADMIN USER SERVICE ===');
    
    return formattedUsers;
  } catch (error) {
    console.error('=== ERROR IN ADMIN USER SERVICE ===');
    console.error('Error fetching users:', error);
    toast.error('Failed to load users');
    return [];
  }
};

export const suspendUser = async (userId: string): Promise<void> => {
  try {
    // Since users table doesn't have status field, we'll need to handle this differently
    // For now, just show a message that this feature needs to be implemented
    toast.error('Suspend user feature needs to be implemented for users table');
  } catch (error) {
    console.error('Error suspending user:', error);
    toast.error('Failed to suspend user');
  }
};

export const activateUser = async (userId: string): Promise<void> => {
  try {
    // Since users table doesn't have status field, we'll need to handle this differently
    toast.error('Activate user feature needs to be implemented for users table');
  } catch (error) {
    console.error('Error activating user:', error);
    toast.error('Failed to activate user');
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

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
      .from('users')
      .update({ credits: credits })
      .eq('id', userId);

    if (error) throw error;
    
    toast.success('Credits added successfully');
  } catch (error) {
    console.error('Error adding credits:', error);
    toast.error('Failed to add credits');
  }
};
