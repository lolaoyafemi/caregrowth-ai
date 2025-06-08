
import { supabase } from '@/integrations/supabase/client';

export const saveSocialPost = async (
  userId: string,
  platform: string,
  audience: string,
  content: string,
  promptCategory: string,
  tone: string
) => {
  try {
    const { data, error } = await supabase
      .from('saved_posts')
      .insert([{
        user_id: userId,
        platform,
        audience,
        content,
        prompt_category: promptCategory,
        tone
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving post:', error);
      throw new Error(error.message || 'Failed to save post');
    }

    return data;
  } catch (error: any) {
    console.error('Error in saveSocialPost:', error);
    throw error;
  }
};

export const fetchSavedPosts = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('saved_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved posts:', error);
      throw new Error(error.message || 'Failed to fetch saved posts');
    }

    return data || [];
  } catch (error: any) {
    console.error('Error in fetchSavedPosts:', error);
    throw error;
  }
};

export const deleteSavedPost = async (postId: string) => {
  try {
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting saved post:', error);
      throw new Error(error.message || 'Failed to delete post');
    }

    return true;
  } catch (error: any) {
    console.error('Error in deleteSavedPost:', error);
    throw error;
  }
};
