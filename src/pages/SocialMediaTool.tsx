
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
import { useUserCredits } from '@/hooks/useUserCredits';

const SocialMediaTool = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [postHistory, setPostHistory] = useState<PostHistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [savedPostsRefreshTrigger, setSavedPostsRefreshTrigger] = useState(0);
  
  // Form states
  const [audience, setAudience] = useState('');
  const [contentCategory, setContentCategory] = useState('');
  const [toneOfPost, setToneOfPost] = useState('professional');
  const [platform, setPlatform] = useState('all');
  
  // Regeneration states
  const [regeneratingSection, setRegeneratingSection] = useState<{platform: string, section: string} | null>(null);

  // Credit management
  const { credits, loading: creditsLoading, refetch } = useUserCredits();

  // Load business profile on component mount
  useEffect(() => {
    loadBusinessProfile();
  }, []);

  const loadBusinessProfile = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;

      if (!userId) return;

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error loading business profile:', error);
        return;
      }

      setBusinessProfile(profile);
    } catch (error) {
      console.error('Error loading business profile:', error);
    }
  };

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
    // Check if user has credits first
    if (credits <= 0) {
      toast.error("You don't have enough credits to generate content. Please purchase more credits to continue.", {
        duration: 5000,
        action: {
          label: "Buy Credits",
          onClick: () => window.open('/payment', '_blank')
        }
      });
      return;
    }

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

      // First generate content, then deduct credits only if successful
      const result = await generatePost(userId, contentCategory, toneOfPost, platform, audience);

      console.log('Generation result:', result);

      if (!result || !result.post) {
        console.error('No post content in result:', result);
        toast.error("No content was generated. Please try again.");
        return;
      }

      // Only deduct credits after successful content generation
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

      // Refresh credits to reflect the deduction
      refetch();

      // Use the generated content directly
      const content: GeneratedContent = {
        facebook: { content: result.content || result.post || result },
        twitter: { content: result.content || result.post || result },
        linkedin: { content: result.content || result.post || result },
        instagram: { content: result.content || result.post || result }
      };

      setGeneratedContent(content);
      toast.success("Content generated successfully!");
      
      // Refresh post history after generation
      fetchPostHistory(1);
      setCurrentPage(1);
    } catch (error: any) {
      console.error("Error generating post:", error);
      toast.error(`Error generating post: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (platform: string, section: string) => {
    // Check if user has credits first
    if (credits <= 0) {
      toast.error("You don't have enough credits to regenerate content. Please purchase more credits to continue.", {
        duration: 5000,
        action: {
          label: "Buy Credits",
          onClick: () => window.open('/payment', '_blank')
        }
      });
      return;
    }

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
      // Get current content for the section
      const currentContent = generatedContent[platform as keyof GeneratedContent][section as keyof GeneratedSection];

      // First regenerate content, then deduct credits only if successful
      const result = await regenerateSection(
        userId,
        contentCategory,
        platform === 'all' ? 'all' : platform,
        section,
        currentContent
      );

      if (!result || !result.success || !result.newContent) {
        throw new Error(result?.error || 'Failed to regenerate section');
      }

      // Only deduct credits after successful regeneration
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

      // Update the content with the new regenerated section
      const updatedContent = {...generatedContent};
      updatedContent[platform as keyof GeneratedContent][section as keyof GeneratedSection] = result.newContent;
      setGeneratedContent(updatedContent);
      
      // Refresh credits to reflect the deduction
      refetch();
      
      setRegeneratingSection(null);
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} regenerated! Remaining credits: ${creditResult.remainingCredits}`);
    } catch (error: any) {
      console.error("Error regenerating section:", error);
      toast.error(`Error regenerating ${section}: ${error.message}`);
      setRegeneratingSection(null);
    }
  };

  const handleCopy = (platform: string) => {
    if (!generatedContent) return;
    
    const content = generatedContent[platform as keyof GeneratedContent];
    const fullText = content.content;
    
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
      const fullText = content.content;
      
      await saveSocialPost(
        userId,
        platform,
        audience,
        fullText,
        contentCategory,
        toneOfPost
      );
      
      // Trigger refresh of saved posts list
      setSavedPostsRefreshTrigger(prev => prev + 1);
      
      toast.success(`Post saved successfully!`);
    } catch (error: any) {
      console.error('Error saving post:', error);
      toast.error(`Failed to save post: ${error.message}`);
    }
  };

  const handleContentChange = (platform: string, section: string, value: string) => {
    if (!generatedContent) return;
    
    const updated = {...generatedContent};
    updated[platform as keyof GeneratedContent].content = value;
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
            {!creditsLoading && (
              <div className="mt-2">
                <span className={`text-sm font-medium ${credits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Available Credits: {credits}
                </span>
                {credits <= 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => window.open('/payment', '_blank')}
                  >
                    Buy Credits
                  </Button>
                )}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowBusinessForm(true)}
            className="flex items-center gap-2"
          >
            <Building2 size={16} />
            {businessProfile ? 'Update business details' : 'Add business details'}
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
        businessProfile={businessProfile}
        onShowBusinessForm={() => setShowBusinessForm(true)}
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

      <SavedPostsList refreshTrigger={savedPostsRefreshTrigger} />

      {showBusinessForm && (
        <BusinessDetailsForm 
          onClose={() => {
            setShowBusinessForm(false);
            loadBusinessProfile(); // Reload profile after form closes
          }} 
        />
      )}
    </div>
  );
};

export default SocialMediaTool;
