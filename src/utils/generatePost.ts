
import { supabase } from '@/integrations/supabase/client'

export const generatePost = async (userId: string, postType: string, tone: string, platform: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-post', {
      body: {
        userId,
        postType,
        tone,
        platform
      }
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error generating post:', error);
    throw error;
  }
}
