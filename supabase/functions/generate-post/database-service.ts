
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

export const getUserProfile = async (supabase: any, userId: string) => {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError) {
    console.error('Profile error:', profileError);
  }

  return profile;
};

export const logPostToHistory = async (
  supabase: any,
  userId: string,
  postType: string,
  tone: string,
  platform: string,
  targetAudience: string,
  finalPost: string
) => {
  const { error: insertError } = await supabase
    .from('post_history')
    .insert([{
      user_id: userId,
      prompt_category: postType,
      tone,
      platform,
      audience: targetAudience,
      content: finalPost
    }]);

  if (insertError) {
    console.error('Error inserting to post_history:', insertError);
  }
};
