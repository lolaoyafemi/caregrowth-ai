
import { supabase } from '@/integrations/supabase/client'

export const generatePost = async (
  userId: string,
  category: string,
  tone: string,
  platform: string,
  audience: string = '',
  subject: string = ''
) => {
  try {
    console.log('Calling generate-post edge function with:', {
      userId,
      postType: category,
      tone,
      platform,
      audience,
      subject
    });

    const { data, error } = await supabase.functions.invoke('generate-post', {
      body: {
        userId,
        postType: category,
        tone,
        platform,
        audience,
        subject
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Failed to generate post');
    }

    console.log('Edge function response:', data);
    return data;
  } catch (error: any) {
    console.error('Error in generatePost:', error);
    throw error;
  }
};
