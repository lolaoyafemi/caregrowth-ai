
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import BusinessDetailsForm from '@/components/business/BusinessDetailsForm';
import SocialMediaForm from '@/components/social-media/SocialMediaForm';
import GeneratedContentTabs from '@/components/social-media/GeneratedContentTabs';
import PostHistoryTable from '@/components/social-media/PostHistoryTable';
import SavedPostsList from '@/components/social-media/SavedPostsList';
import { generatePost } from '@/utils/generatePost';
import { deductCredits, handleCreditError } from '@/utils/creditUtils';
import { saveSocialPost } from '@/utils/savedPostsUtils';
import { GeneratedContent, PostHistoryItem, GeneratedSection } from '@/types/social-media';
import { regenerateSection } from '@/utils/regenerateSection';

const SocialMediaTool = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [postHistory, setPostHistory] = useState<PostHistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Form states
  const [audience, setAudience] = useState('');
  const [contentCategory, setContentCategory] = useState('');
  const [toneOfPost, setToneOfPost] = useState('professional');
  const [platform, setPlatform] = useState('all');
  
  // Regeneration states
  const [regeneratingSection, setRegeneratingSection] = useState<{platform: string, section: string} | null>(null);

  // Fetch post history
  const fetchPostHistory = async (page: number = 1) => {
    setIsLoadingHistory(true);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;

      if (!userId) {
        console.error("User not logged in");
        return;
      }

      const itemsPerPage = 10;
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      const { data: posts, error, count } = await supabase
        .from('post_history')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        console.error('Error fetching post history:', error);
        return;
      }

      setPostHistory(posts || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching post history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load post history on component mount
  useEffect(() => {
    fetchPostHistory(currentPage);
  }, [currentPage]);

  const handleGenerate = async () => {
    if (!audience) {
      toast.error("Please fill in the target audience field.");
      return;
    }
    if (!contentCategory) {
      toast.error("Please select a content category.");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;

      if (!userId) {
        toast.error("User not logged in.");
        return;
      }

      console.log('Starting post generation...');

      // Deduct credits before generating content (1 credit per generation)
      const creditResult = await deductCredits(
        userId, 
        'social_media', 
        1, 
        `Generated ${platform} content for ${contentCategory} targeting ${audience}`
      );

      if (!creditResult.success) {
        handleCreditError(creditResult);
        return;
      }

      toast.success(`1 credit deducted. Remaining credits: ${creditResult.remainingCredits}`);

      const result = await generatePost(userId, contentCategory, toneOfPost, platform, audience);

      console.log('Generation result:', result);

      if (result && result.post) {
        // Use the parsed components if available, otherwise split the post
        let hook, body, cta;
        
        if (result.hook && result.body && result.cta) {
          hook = result.hook;
          body = result.body;
          cta = result.cta;
        } else {
          // Fallback to splitting the post
          const postLines = result.post.split('\n').filter(line => line.trim());
          hook = postLines[0] || result.post;
          body = postLines.slice(1, -1).join('\n') || result.post;
          cta = postLines[postLines.length - 1] || "Contact us today!";
        }

        const content: GeneratedContent = {
          facebook: { hook, body, cta },
          twitter: { hook, body, cta },
          linkedin: { hook, body, cta },
          instagram: { hook, body, cta }
        };

        setGeneratedContent(content);
        toast.success("Content generated successfully!");
        
        // Refresh post history after generation
        fetchPostHistory(1);
        setCurrentPage(1);
      } else {
        console.error('No post content in result:', result);
        toast.error("No content was generated. Please try again.");
      }
    } catch (error: any) {
      console.error("Error generating post:", error);
      toast.error(`Error generating post: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (platform: string, section: string) => {
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (!userId) {
      toast.error("User not logged in.");
      return;
    }

    if (!generatedContent) {
      toast.error("No content available to regenerate.");
      return;
    }

    setRegeneratingSection({platform, section});

    try {
      // Deduct credits for regeneration (1 credit per section regeneration)
      const creditResult = await deductCredits(
        userId, 
        'social_media', 
        1, 
        `Regenerated ${section} for ${platform}`
      );

      if (!creditResult.success) {
        handleCreditError(creditResult);
        setRegeneratingSection(null);
        return;
      }

      // Get current content for the section
      const currentContent = generatedContent[platform as keyof GeneratedContent][section as keyof GeneratedSection];

      // Call the regenerate section function
      const result = await regenerateSection(
        userId,
        contentCategory,
        platform === 'all' ? 'all' : platform,
        section,
        currentContent
      );

      if (result && result.success && result.newContent) {
        // Update the content with the new regenerated section
        const updatedContent = {...generatedContent};
        updatedContent[platform as keyof GeneratedContent][section as keyof GeneratedSection] = result.newContent;
        setGeneratedContent(updatedContent);
        
        setRegeneratingSection(null);
        toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} regenerated! Remaining credits: ${creditResult.remainingCredits}`);
      } else {
        throw new Error(result?.error || 'Failed to regenerate section');
      }
    } catch (error: any) {
      console.error("Error regenerating section:", error);
      toast.error(`Error regenerating ${section}: ${error.message}`);
      setRegeneratingSection(null);
    }
  };

  const handleCopy = (platform: string) => {
    if (!generatedContent) return;
    
    const content = generatedContent[platform as keyof GeneratedContent];
    const fullText = `${content.hook}\n\n${content.body}\n\n${content.cta}`;
    
    navigator.clipboard.writeText(fullText);
    toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} content copied to clipboard!`);
  };

  const handleCopyHistoryPost = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Post copied to clipboard!");
  };

  const handleViewPost = (content: string) => {
    toast.info(content);
  };

  const handleSavePost = async (platform: string) => {
    if (!generatedContent) return;
    
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;

      if (!userId) {
        toast.error("User not logged in.");
        return;
      }

      const content = generatedContent[platform as keyof GeneratedContent];
      const fullText = `${content.hook}\n\n${content.body}\n\n${content.cta}`;
      
      await saveSocialPost(
        userId,
        platform,
        audience,
        fullText,
        contentCategory,
        toneOfPost
      );
      
      toast.success(`Post saved successfully!`);
    } catch (error: any) {
      console.error('Error saving post:', error);
      toast.error(`Failed to save post: ${error.message}`);
    }
  };

  const handleContentChange = (platform: string, section: string, value: string) => {
    if (!generatedContent) return;
    
    const updated = {...generatedContent};
    updated[platform as keyof GeneratedContent][section as keyof typeof updated.facebook] = value;
    setGeneratedContent(updated);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Social Media Content Generator</h1>
            <p className="text-gray-600 mt-2">Generate engaging social media content for multiple platforms with AI assistance.</p>
            <p className="text-sm text-gray-500 mt-1">Cost: 1 credit per generation, 1 credit per section regeneration</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowBusinessForm(true)}
            className="flex items-center gap-2"
          >
            <Building2 size={16} />
            More about my business
          </Button>
        </div>
      </div>

      <SocialMediaForm
        audience={audience}
        setAudience={setAudience}
        contentCategory={contentCategory}
        setContentCategory={setContentCategory}
        toneOfPost={toneOfPost}
        setToneOfPost={setToneOfPost}
        platform={platform}
        setPlatform={setPlatform}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />

      <GeneratedContentTabs
        generatedContent={generatedContent}
        isGenerating={isGenerating}
        regeneratingSection={regeneratingSection}
        onRegenerateSection={handleRegenerateSection}
        onCopy={handleCopy}
        onSavePost={handleSavePost}
        onContentChange={handleContentChange}
      />

      <PostHistoryTable
        postHistory={postHistory}
        isLoadingHistory={isLoadingHistory}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onCopyHistoryPost={handleCopyHistoryPost}
        onViewPost={handleViewPost}
      />

      <SavedPostsList />

      {showBusinessForm && (
        <BusinessDetailsForm onClose={() => setShowBusinessForm(false)} />
      )}
    </div>
  );
};

export default SocialMediaTool;
