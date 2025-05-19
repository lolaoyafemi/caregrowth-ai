
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";

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

const SocialMediaTool = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  
  // Form states
  const [industry, setIndustry] = useState('');
  const [offerName, setOfferName] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('all');
  
  // Regeneration states
  const [regeneratingSection, setRegeneratingSection] = useState<{platform: string, section: string} | null>(null);
  
  // Saved posts
  const [savedPosts, setSavedPosts] = useState<Array<{
    id: number, 
    platform: string,
    offerName: string, 
    content: string,
    date: string
  }>>([]);

  const handleGenerate = () => {
    if (!industry || !offerName || !audience) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    setIsGenerating(true);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      const content: GeneratedContent = {
        facebook: {
          hook: `🔥 Attention ${audience}! Struggling with [common pain point in ${industry}]?`,
          body: `Our ${offerName} has been helping businesses just like yours achieve remarkable results. With our proven approach, you'll be able to overcome challenges and reach your goals faster than ever.\n\nOne of our clients recently reported a 40% increase in productivity after implementing our solutions!`,
          cta: `Ready to transform your ${industry} business? Click the link in bio to learn more about ${offerName} or DM us for a free consultation! ⏰ Limited spots available.`
        },
        twitter: {
          hook: `${audience} in ${industry}: Your workflow is about to change forever.`,
          body: `Introducing ${offerName}: the solution you've been waiting for. Stop wasting time on inefficient processes.`,
          cta: `Click here to see how we're helping businesses save 20+ hours per week. #${industry.replace(/\s+/g, '')} #Productivity`
        },
        linkedin: {
          hook: `I'm excited to announce our newest solution for ${industry} professionals looking to maximize efficiency.`,
          body: `After months of research and development, our team at CareGrowth has created ${offerName} specifically designed for ${audience}.\n\nThe results?\n\n✅ 35% reduction in operational costs\n✅ 50% less time spent on administrative tasks\n✅ Improved team satisfaction and retention\n\nIn today's competitive landscape, businesses can't afford to fall behind on innovation.`,
          cta: `If you're interested in learning how ${offerName} can benefit your organization, let's connect. I'm offering 5 free strategy sessions this week to qualified businesses.`
        },
        instagram: {
          hook: `Double tap if you're tired of the same old ${industry} problems! 👇`,
          body: `We get it. Being a ${audience} is challenging enough without having to deal with [specific industry pain point].\n\nThat's why we created ${offerName}.\n\nImagine having all the tools you need to succeed, wrapped in one simple solution.`,
          cta: `Swipe up to learn more about how ${offerName} is changing the game for ${audience} everywhere! Limited time offer: Get 15% off when you sign up this week.`
        }
      };
      
      setGeneratedContent(content);
      setIsGenerating(false);
      toast.success("Content generated successfully!");
    }, 2000);
  };

  const handleRegenerateSection = (platform: string, section: string) => {
    setRegeneratingSection({platform, section});
    
    setTimeout(() => {
      if (generatedContent) {
        const updatedContent = {...generatedContent};
        switch (section) {
          case 'hook':
            updatedContent[platform as keyof GeneratedContent].hook = 
              `NEW HOOK: Are you a ${audience} tired of struggling with ${industry} challenges? This will change everything...`;
            break;
          case 'body':
            updatedContent[platform as keyof GeneratedContent].body = 
              `NEW BODY: We developed ${offerName} specifically for people like you. Our solution addresses the exact problems you're facing daily, with proven results for businesses in your position.\n\nIn fact, our latest case study showed an average ROI of 300% within just 90 days!`;
            break;
          case 'cta':
            updatedContent[platform as keyof GeneratedContent].cta = 
              `NEW CTA: Don't miss this opportunity to revolutionize your ${industry} business. Click now to secure your spot before we reach capacity!`;
            break;
        }
        setGeneratedContent(updatedContent);
      }
      
      setRegeneratingSection(null);
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} regenerated!`);
    }, 1500);
  };

  const handleCopy = (platform: string) => {
    if (!generatedContent) return;
    
    const content = generatedContent[platform as keyof GeneratedContent];
    const fullText = `${content.hook}\n\n${content.body}\n\n${content.cta}`;
    
    navigator.clipboard.writeText(fullText);
    toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} content copied to clipboard!`);
  };

  const handleSavePost = (platform: string) => {
    if (!generatedContent) return;
    
    const content = generatedContent[platform as keyof GeneratedContent];
    const fullText = `${content.hook}\n\n${content.body}\n\n${content.cta}`;
    
    const newPost = {
      id: Date.now(),
      platform,
      offerName,
      content: fullText,
      date: new Date().toISOString().split('T')[0]
    };
    
    setSavedPosts([...savedPosts, newPost]);
    toast.success(`Saved to your ${platform} drafts!`);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Social Media Content Generator</h1>
        <p className="text-gray-600 mt-2">Generate engaging social media content for multiple platforms with AI assistance.</p>
      </div>

      <Card className="p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., Digital Marketing, Healthcare, Real Estate"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="offerName">Offer Name</Label>
              <Input
                id="offerName"
                placeholder="e.g., Social Media Management Package"
                value={offerName}
                onChange={(e) => setOfferName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                placeholder="e.g., Small Business Owners, Marketing Managers"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
          </div>
          <div>
            <div className="mb-4">
              <Label htmlFor="tone">Tone of Voice</Label>
              <Select value={tone} onValueChange={setTone}>
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
                  <SelectItem value="offer">Sort by Offer</SelectItem>
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
                  <h4 className="font-medium mb-1">{post.offerName}</h4>
                  <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SocialMediaTool;
