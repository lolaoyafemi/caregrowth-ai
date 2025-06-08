
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { userId, postType, platform, section, currentContent } = await req.json();
    console.log('Regenerate section request:', {
      userId,
      postType,
      platform,
      section,
      currentContent
    });

    if (!supabaseServiceKey || !supabaseUrl) {
      console.error('Missing environment variables');
      throw new Error('Missing environment variables');
    }

    if (!userId || !postType || !section) {
      throw new Error('Missing required parameters: userId, postType, or section');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile for personalization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
    }

    // Get prompt templates for the specified content type and platform
    const { data: prompts, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('category', postType)
      .in('platform', [platform, 'all']);

    console.log('Fetched prompts for regeneration:', prompts);

    if (promptError) {
      console.error('Prompt fetch error:', promptError);
    }

    let selectedPrompt = null;
    if (prompts && prompts.length > 0) {
      // Prefer platform-specific prompts, then fall back to 'all' platform prompts
      selectedPrompt = prompts.find(p => p.platform === platform) || 
                      prompts.find(p => p.platform === 'all') || 
                      prompts[0];
    }

    console.log('Selected prompt for regeneration:', selectedPrompt);

    // Enhanced function to parse arrays from prompt templates
    const parsePromptArray = (text) => {
      if (!text || typeof text !== 'string') return [];
      
      try {
        // Handle different possible formats:
        // 1. JSON array format: ["item1", "item2", "item3"]
        if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
          return JSON.parse(text);
        }
        
        // 2. Comma-separated quoted strings: "item1", "item2", "item3"
        // Split by comma and clean up quotes and whitespace
        return text.split(',')
          .map(item => item.trim())
          .map(item => {
            // Remove surrounding quotes (single or double)
            return item.replace(/^["']|["']$/g, '');
          })
          .filter(item => item.length > 0); // Remove empty items
      } catch (error) {
        console.error('Error parsing prompt array:', error, 'Text:', text);
        return [];
      }
    };

    let newContent = '';

    if (selectedPrompt) {
      console.log('Raw prompt data for regeneration:', {
        hook: selectedPrompt.hook,
        body: selectedPrompt.body,
        cta: selectedPrompt.cta
      });

      // Parse the appropriate section array
      let sectionOptions = [];
      
      if (section === 'hook') {
        sectionOptions = parsePromptArray(selectedPrompt.hook);
      } else if (section === 'body') {
        sectionOptions = parsePromptArray(selectedPrompt.body);
      } else if (section === 'cta') {
        sectionOptions = parsePromptArray(selectedPrompt.cta);
      }

      console.log(`Parsed ${section} options:`, sectionOptions);

      if (sectionOptions.length > 0) {
        // Filter out the current content to avoid selecting the same option
        const availableOptions = sectionOptions.filter(option => {
          const personalizedOption = personalizeText(option, profile);
          return personalizedOption !== currentContent;
        });

        // If all options are the same as current, use all options
        const optionsToChooseFrom = availableOptions.length > 0 ? availableOptions : sectionOptions;
        
        // Randomly select from available options
        const selectedOption = optionsToChooseFrom[Math.floor(Math.random() * optionsToChooseFrom.length)];
        newContent = personalizeText(selectedOption, profile);

        console.log(`Selected new ${section}:`, newContent);
      } else {
        throw new Error(`No ${section} options available in template`);
      }
    } else {
      throw new Error('No prompts found for the specified content type and platform');
    }

    // Personalize text with business context
    function personalizeText(text, profile) {
      if (!profile || !text) return text;
      
      return text
        .replace(/\[business_name\]/gi, profile.business_name || 'our business')
        .replace(/\[location\]/gi, profile.location || 'your area')
        .replace(/\[service\]/gi, profile.services || profile.core_service || 'our services')
        .replace(/\[differentiator\]/gi, profile.differentiator || 'professional care')
        .replace(/\[audience\]/gi, 'families')
        .replace(/\[main_offer\]/gi, profile.main_offer || 'our services')
        .replace(/\[ideal_client\]/gi, profile.ideal_client || 'families');
    }

    return new Response(JSON.stringify({
      success: true,
      newContent,
      section
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in regenerate-section function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
