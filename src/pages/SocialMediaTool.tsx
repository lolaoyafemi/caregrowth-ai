import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toast } from "sonner";
import { Building2, Copy, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import BusinessDetailsForm from '@/components/business/BusinessDetailsForm';
import { generatePost } from '@/utils/generatePost';
import { deductCredits, handleCreditError } from '@/utils/creditUtils';

interface GeneratedSection {
  hook: string;
  body: string;
  cta: string;
}

interface GeneratedContent {
  facebook: GeneratedSection;
  twitter: GeneratedSection;
  linkedin: GeneratedSection;
  instagram: GeneratedSection;
}

interface PostHistoryItem {
  id: string;
  content: string;
  prompt_category: string;
  tone: string;
  platform: string;
  created_at: string;
}

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
  
  // Saved posts
  const [savedPosts, setSavedPosts] = useState<Array<{
    id: number, 
    platform: string,
    audience: string, 
    content: string,
    date: string
  }>>([]);

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

      const result = await generatePost(userId, contentCategory, toneOfPost, platform);

      if (result.post) {
        const content: GeneratedContent = {
          facebook: {
            hook: result.post.split('\n')[0],
            body: result.post,
            cta: "Let's chat if this resonates!"
          },
          twitter: { hook: "", body: "", cta: "" },
          linkedin: { hook: "", body: "", cta: "" },
          instagram: { hook: "", body: "", cta: "" }
        };

        setGeneratedContent(content);
        toast.success("Content generated successfully!");
        
        // Refresh post history after generation
        fetchPostHistory(1);
        setCurrentPage(1);
      } else {
        toast.error("No post returned.");
      }
    } catch (error) {
      console.error("Error generating post:", error);
      toast.error("Error generating post.");
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

    setRegeneratingSection({platform, section});

    try {
      // Deduct credits for regeneration (0.5 credits per section regeneration)
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

      setTimeout(() => {
        if (generatedContent) {
          const updatedContent = {...generatedContent};
          switch (section) {
            case 'hook':
              updatedContent[platform as keyof GeneratedContent].hook = 
                `NEW HOOK: Are you a ${audience} tired of struggling with daily challenges? This will change everything...`;
              break;
            case 'body':
              updatedContent[platform as keyof GeneratedContent].body = 
                `NEW BODY: We developed our solution specifically for people like you. Our approach addresses the exact problems you're facing daily, with proven results for professionals in your position.\n\nIn fact, our latest case study showed an average ROI of 300% within just 90 days!`;
              break;
            case 'cta':
              updatedContent[platform as keyof GeneratedContent].cta = 
                `NEW CTA: Don't miss this opportunity to revolutionize your business. Click now to secure your spot before we reach capacity!`;
              break;
          }
          setGeneratedContent(updatedContent);
        }
        
        setRegeneratingSection(null);
        toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} regenerated! Remaining credits: ${creditResult.remainingCredits}`);
      }, 1500);
    } catch (error) {
      console.error("Error regenerating section:", error);
      toast.error("Error regenerating section.");
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

  const handleSavePost = (platform: string) => {
    if (!generatedContent) return;
    
    const content = generatedContent[platform as keyof GeneratedContent];
    const fullText = `${content.hook}\n\n${content.body}\n\n${content.cta}`;
    
    const newPost = {
      id: Date.now(),
      platform,
      audience,
      content: fullText,
      date: new Date().toISOString().split('T')[0]
    };
    
    setSavedPosts([...savedPosts, newPost]);
    toast.success(`Saved to your ${platform} drafts!`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
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

      <Card className="p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                placeholder="e.g., Small Business Owners, Marketing Managers"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="contentCategory">Type of Content</Label>
              <Select value={contentCategory} onValueChange={setContentCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trust-authority">Trust & Authority</SelectItem>
                  <SelectItem value="heartfelt-relatable">Heartfelt & Relatable</SelectItem>
                  <SelectItem value="educational-helpful">Educational & Helpful</SelectItem>
                  <SelectItem value="results-offers">Results & Offers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="mb-4">
              <Label htmlFor="tone">Tone of Post</Label>
              <Select value={toneOfPost} onValueChange={setToneOfPost}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="humorous">Humorous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <Label htmlFor="platform">Platform Focus</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-8">
              <Button 
                className="w-full bg-caregrowth-blue text-white"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating Content..." : "Generate Content"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {(generatedContent || isGenerating) && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Generated Content</h2>
          <Tabs defaultValue="facebook">
            <TabsList className="mb-6 w-full justify-start">
              <TabsTrigger value="facebook">Facebook</TabsTrigger>
              <TabsTrigger value="twitter">Twitter</TabsTrigger>
              <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
              <TabsTrigger value="instagram">Instagram</TabsTrigger>
            </TabsList>
            
            {["facebook", "twitter", "linkedin", "instagram"].map((platform) => (
              <TabsContent key={platform} value={platform}>
                <Card className="p-6">
                  {isGenerating ? (
                    <div className="min-h-[200px] flex items-center justify-center">
                      <div className="animate-pulse text-center">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/6 mx-auto"></div>
                      </div>
                    </div>
                  ) : generatedContent && (
                    <>
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">Hook</h3>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRegenerateSection(platform, 'hook')}
                            disabled={regeneratingSection !== null}
                          >
                            {regeneratingSection?.platform === platform && regeneratingSection?.section === 'hook'
                              ? "Regenerating..."
                              : "Regenerate Hook"
                            }
                          </Button>
                        </div>
                        <Textarea 
                          className="min-h-[80px]" 
                          value={generatedContent[platform as keyof GeneratedContent].hook}
                          onChange={(e) => {
                            const updated = {...generatedContent};
                            updated[platform as keyof GeneratedContent].hook = e.target.value;
                            setGeneratedContent(updated);
                          }}
                        />
                      </div>
                      
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">Body</h3>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRegenerateSection(platform, 'body')}
                            disabled={regeneratingSection !== null}
                          >
                            {regeneratingSection?.platform === platform && regeneratingSection?.section === 'body'
                              ? "Regenerating..."
                              : "Regenerate Body"
                            }
                          </Button>
                        </div>
                        <Textarea 
                          className="min-h-[150px]" 
                          value={generatedContent[platform as keyof GeneratedContent].body}
                          onChange={(e) => {
                            const updated = {...generatedContent};
                            updated[platform as keyof GeneratedContent].body = e.target.value;
                            setGeneratedContent(updated);
                          }}
                        />
                      </div>
                      
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">Call to Action</h3>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRegenerateSection(platform, 'cta')}
                            disabled={regeneratingSection !== null}
                          >
                            {regeneratingSection?.platform === platform && regeneratingSection?.section === 'cta'
                              ? "Regenerating..."
                              : "Regenerate CTA"
                            }
                          </Button>
                        </div>
                        <Textarea 
                          className="min-h-[80px]" 
                          value={generatedContent[platform as keyof GeneratedContent].cta}
                          onChange={(e) => {
                            const updated = {...generatedContent};
                            updated[platform as keyof GeneratedContent].cta = e.target.value;
                            setGeneratedContent(updated);
                          }}
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleCopy(platform)}
                        >
                          Copy to Clipboard
                        </Button>
                        <Button 
                          className="flex-1 bg-caregrowth-green"
                          onClick={() => handleSavePost(platform)}
                        >
                          Save Post
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {/* Post History Table */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Post History</h2>
        <Card className="p-6">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse">Loading post history...</div>
            </div>
          ) : postHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No posts generated yet. Generate your first post above!
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tone</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postHistory.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="text-sm">
                        {formatDate(post.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 capitalize">
                          {post.prompt_category?.replace('-', ' ') || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 capitalize">
                          {post.tone || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 capitalize">
                          {post.platform || 'All'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-gray-700">
                          {truncateContent(post.content || '', 80)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyHistoryPost(post.content || '')}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.info(post.content || 'No content')}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      {currentPage > 1 && (
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="cursor-pointer"
                          />
                        </PaginationItem>
                      )}
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      {currentPage < totalPages && (
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="cursor-pointer"
                          />
                        </PaginationItem>
                      )}
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
      
      {savedPosts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Saved Posts</h2>
          <Card className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-medium">Recent Drafts</h3>
              <Select defaultValue="date">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="platform">Sort by Platform</SelectItem>
                  <SelectItem value="audience">Sort by Audience</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
              {savedPosts.map((post) => (
                <div key={post.id} className="border rounded-md p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-caregrowth-lightblue text-caregrowth-blue capitalize mr-2">
                        {post.platform}
                      </span>
                      <span className="text-sm text-gray-500">{post.date}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">Edit</Button>
                      <Button variant="ghost" size="sm">Delete</Button>
                    </div>
                  </div>
                  <h4 className="font-medium mb-1">{post.audience}</h4>
                  <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {showBusinessForm && (
        <BusinessDetailsForm onClose={() => setShowBusinessForm(false)} />
      )}
    </div>
  );
};

export default SocialMediaTool;
