
import { supabase } from '@/integrations/supabase/client'

export const generatePost = async (userId: string, postType: string, tone: string, platform: string) => {
  try {
    console.log('Calling generate-post function with:', { userId, postType, tone, platform });
    
    const { data, error } = await supabase.functions.invoke('generate-post', {
      body: {
        userId,
        postType,
        tone,
        platform
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw error;
    }

    console.log('Generate post response:', data);
    return data;
  } catch (error) {
    console.error('Error generating post:', error);
    throw error;
  }
}
