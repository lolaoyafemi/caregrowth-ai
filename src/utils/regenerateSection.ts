
import { supabase } from '@/integrations/supabase/client'

export const regenerateSection = async (
  userId: string,
  postType: string,
  platform: string,
  section: string,
  currentContent: string
) => {
  try {
    console.log('Calling regenerate-section edge function with:', {
      userId,
      postType,
      platform,
      section,
      currentContent
    });

    const { data, error } = await supabase.functions.invoke('regenerate-section', {
      body: {
        userId,
        postType,
        platform,
        section,
        currentContent
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Failed to regenerate section');
    }

    console.log('Regenerate section response:', data);
    return data;
  } catch (error: any) {
    console.error('Error in regenerateSection:', error);
    throw error;
  }
};
